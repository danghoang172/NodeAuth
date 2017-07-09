var app = angular.module("app", []);
var baseURL = "http://localhost:8080/";

    app.controller("ctrl", function($scope, $http, $window) {

      var url;
      var newWindow;
	  var user;
	  $scope.myValue = true;
	  $scope.isMature;
	  
      $http.get(baseURL + "url").then(function(response) {
        url = response.data;
      });
	  	  
	  $scope.getUserInfo = function() {	
		$http.get(baseURL + "userinfo").then(function(response) {
        user = response.data;
		$scope.isMature =$scope.checkAge(user.ageRange.min);
      });
	  	
      };
	  
	  $scope.checkAge = function(age) {	
		if(age >= 18){
			return true;
		}
		else{
			return false;
		}
      };

      $scope.auth = function() {		
        newWindow = $window.open(url, "Sign in with Google", "width=1024,height=768");        
      };

      window.onmessage = function(e) {
        newWindow.close();
        var urlWithCode = e.data;
        var idx = urlWithCode.lastIndexOf("code=");
        var code = urlWithCode.substring(idx + 5).replace("#","");
        $http.get(baseURL + "tokens?code=" + code).then(function(response) {
		  $scope.myValue = false;
		  $scope.getUserInfo();
		  
        });
		

      };

    });
