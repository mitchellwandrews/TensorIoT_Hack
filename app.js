const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const aws = require('aws-sdk');
const mysql = require('mysql');
const moment = require('moment');
const sqs = new aws.SQS({ region: 'us-east-1' });
const dynamodb = new aws.DynamoDB({ apiVersion: '2012-10-08', region: 'us-east-1' });

const app = express();
const queueUrl = 'https://sqs.us-east-1.amazonaws.com/483956658178/tensor_queue';
const sql = mysql.createConnection({
  host: 'tensor.c1mon2gw03nb.us-east-1.rds.amazonaws.com',
  user: 'user',
  password: 'password',
  port: '3306',
  database: 'tensordb'
});

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'assets')));
app.use(express.static(path.join(__dirname, 'node_modules')));
aws.config.loadFromPath(__dirname + '/config.json');

sql.connect(function (err) {
  if (err) {
    console.error('DB connection failed', err.stack);
    return;
  }
});

app.get('/', (req, res) => {
  return res.render('index');
});

app.get('/alarms', (req, res) => {
  let alarms = sql.query("SELECT * FROM alarm;", (err, result, fields) => {
    if (err) return res.status(500).send(err);

    return res.status(200).send(JSON.stringify(result));
  });
});

app.post('/alarms', (req, res) => {
  console.log(req.body);
  let alarm = {
    start_time: moment().format('x'),
    end_time: moment().add(5, 'm').format('x')
  };

  sql.query(`INSERT INTO alarm (start_time, end_time, check_in) VALUES ('${alarm.start_time}', '${alarm.end_time}', 'false')`, (err, result, fields) => {
    if (err) return res.status(500).send(err);

    return res.status(200).send();
    // createAlert(alarm, () => {
    //
    // });
  });
});

app.delete('/alarms/:id', (req, res) => {
  let id = req.params.id;

  sql.query(`DELETE FROM alarm WHERE id = ${id};`, (err, result, fields) => {
    if (err) return res.status(500).send();

    return res.status(200).send();
  });
});

app.listen(3000, () => {

});

createAlert = (alarm, callback) => {
  let date = new Date();
  let start_time = moment().format('x');
  let end_time = moment().add(5, 'm').format('x');
  console.log(start_time, end_time);

  // sql.query(`INSERT INTO alert (start_time)`)
  // let params = {
  //   "TableName": "tensor",
  //   "Item": {
  //     "start_time": { "N": start_time },
  //     "end_time": { "N": end_time },
  //     "checked_in": { "BOOL": false}
  //   }
  // };
  //
  // dynamodb.putItem(params, function (err, data) {
  //   if (err) {
  //     console.error('error', err);
  //   } else {
  //     console.log('success', data);
  //     callback();
  //   }
  // });
}

function processMessage (time) {
  sql.query(`SELECT * FROM alarm;`, (err, result, fields) => {
    if (err) {
      console.log(err);
    }

    result.forEach(item => {
      if (Number(item.start_time) <= Number(time.Body) && Number(item.end_time) >= Number(time.Body)) {
        sql.query(`UPDATE alarm SET check_in='true' WHERE id=${item.id}`, (err, result, fields) => {
          let params = {
            QueueUrl: queueUrl,
            ReceiptHandle: time.ReceiptHandle
          }
          sqs.deleteMessage(params, (err, data) => {
            if (err) {
              console.log(err);
            } else {
              return;
            }
          })
        });
      }
    });
  });

}

function fetchMessages() {
  let params = {
    QueueUrl: queueUrl,
    VisibilityTimeout: 60
  };

  sqs.receiveMessage(params, function (err, data) {
    if (err) {
      console.log("ERR", err);
    } else {
      if (data.Messages) {
        processMessage(data.Messages[0]);
      }
    }
    console.log("interval");
  });
}

fetchMessages();
setInterval(fetchMessages, 10000);
