﻿// Angular Controller

var parseJsonDateString = function (dateCandidate) {
	var jsonDateRe = /^\/Date\((-?\d+)(\+|-)?(\d+)?\)\/$/;
	var arr = dateCandidate && jsonDateRe.exec(dateCandidate);
	if (arr) {
		return new Date(parseInt(arr[1]));
	}
	return dateCandidate;
};

var NotificationItem = function (notification) {
	var self = this;
	self.Id = notification.Id;
	self.Title = notification.Title;
	self.Message = notification.Message;
	self.Type = notification.Type;
	self.UtcTimestamp = parseJsonDateString(notification.UtcTimestamp);
	self.Read = notification.Read;

	self.LabelClass = 'label-' + notification.Type.toLowerCase();
};

var SelectionItem = function (value, selected) {
	var self = this;
	self.Value = value;
	self.Selected = selected;
};

var NotificationController = function ($scope) {
	var xsocket = $scope.webSocket;
	var maxLength = typeof $scope.maxLength !== 'undefined' ? $scope.maxLength : 5;	// default value

	$scope.dateFormat = 'yyyy-MM-dd HH:mm:ss';

	$scope.Notifications = [];
	$scope.AllTypes = [];
	$scope.SelectedTypes = [];
	$scope.LabelClass = 'label-default';
	$scope.Listening = true;
	$scope.ToggleText = 'On';

	// When a notification arrives, add it to the array
	xsocket.on('notify', function (notification) {
		$scope.Add(notification);
		$scope.$apply();
	});

	// Listen for all types (published at bottom of open event)
	xsocket.on('allTypes', function (types) {
		$scope.AddAllTypes(types);
	});

	$scope.toggleListening = function () {
		$scope.Listening = !$scope.Listening;

		// Tell XSockets about the change
		// Note that this will update the actual property on the controller without any method decalred being called
		xsocket.publish('set_Listening', { value: $scope.Listening });

		if ($scope.Listening)
			$scope.ToggleText = "On";
		$scope.ToggleText = "Off";
	};

	$scope.markAsRead = function (notification) {
		notification.Read = !notification.Read;

		// Tell XSockets about the change
		var json = { id: notification.Id, value: notification.Read };
		xsocket.trigger('MarkAsRead', json);

		$scope.Remove(notification);
	};

	$scope.toggleSelection = function (item) {
		item.Selected = !item.Selected;

		var selected = item.Selected;
		var value = item.Value;

		if (selected === true)
			console.log("Selecting '" + value + "'");
		else
			console.log("Deselecting '" + value + "'");

		$scope.SelectedTypes.map(function (type) {
			if (type.Value === value)
				type.Selected = item.Selected;
		});

		var selectedTypes = $scope
							.SelectedTypes
							.filter(function (type) { return type.Selected === true; })
							.map(function (type) { return type.Value; });

		// Tell XSockets about the change
		xsocket.publish('set_SelectedTypes', selectedTypes);
	};

	$scope.AddAllTypes = function (types) {
		types.forEach(function (type) {
			$scope.AllTypes.push(type);
			$scope.SelectedTypes.push(new SelectionItem(type, true));
		});
		$scope.$apply();
	};

	$scope.Add = function (notification) {
		$scope.Notifications.push(new NotificationItem(notification));

		if ($scope.Notifications.length > maxLength)
			$scope.Notifications.splice(0, 1); // remove the oldest event

		$scope.updateMaxTypeLevel();
		$scope.$apply();
	};
	
	$scope.Remove = function (notification) {
		// $scope.Notifications.remove(function (item) { return item.Id === notification.Id });
		$scope.Notifications.remove(notification);	// <-- TODO!

		$scope.updateMaxTypeLevel();
		$scope.$apply();
	};

	$scope.updateMaxTypeLevel = function () {
		$scope.LabelClass = 'label-' + $scope.maxTypeLevel().toLowerCase();
	};

	$scope.maxTypeLevel = function () {
		var types = $scope.uniqueTypes();
		var registredTypes = $scope.AllTypes;

		for (var i = registredTypes.length - 1; i > 0; i--) {
			if (types.indexOf(registredTypes[i]) !== -1)
				return registredTypes[i];
		}

		return 'default';
	};

	$scope.uniqueTypes = function () {
		var existingTypes = $scope.Notifications.map(function (item) { return item.Type; });

		return existingTypes.filter(distinct);
	};

	function distinct(value, index, theArray) {
		return theArray.indexOf(value) === index;
	}
};