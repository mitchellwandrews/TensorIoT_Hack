'use strict';

angular
  .module('TensorApp', [])
  .controller('MainController', ['$scope', 'ApiService', '$timeout', MainController])
  .service('ApiService', ['$http', ApiService]);

  function MainController ($scope, ApiService, $timeout) {
    $scope.alarms = [];

    ($scope.getData = function () {
      $scope.loadingAlarms = true;
      ApiService.getRequest('/alarms', function (data) {
        $scope.$applyAsync(function () {
          $scope.alarms = data;
          console.log($scope.alarms);
          $scope.loadingAlarms = false;
        });
      });
    })();

    $scope.deleteAlarm = function (id) {
      $scope.loadingAlarms = true;
      ApiService.deleteRequest(`/alarms/${id}`, function () {
        $scope.getData();
      });
    }

    $scope.saveAlarm = function (event) {
      event.preventDefault();
      $scope.loadingAlarms = true;

      console.log($scope.alarm);

      ApiService.postRequest('/alarms', {}, function () {
        $scope.$applyAsync(function () {
          $scope.alarm = {};
          $('#alarmAddModal').modal('hide');
        });
        $scope.getData();
      });
    }
  }

  function ApiService ($http) {
    return {
      getRequest: function (route, callback) {
        $http({
          method: 'GET',
          url: route
        }).then(function (response) {
          callback(response.data);
        });
      },
      postRequest: function (route, data, callback) {
        $http({
          method: 'POST',
          url: route,
          data: data
        }).then(function (response) {
          callback(response);
        }).catch();
      },
      deleteRequest: function (route, callback) {
        $http({
          method: 'DELETE',
          url: route
        }).then(function (response) {
          callback(response);
        });
      }
    };
  }
