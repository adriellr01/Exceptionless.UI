(function () {
  'use strict';

  angular.module('app.event')
    .controller('Event', ['$scope', '$state', '$stateParams', 'errorService', 'eventService', 'hotkeys', 'linkService', 'notificationService', 'projectService', 'urlService', function ($scope, $state, $stateParams, errorService, eventService, hotkeys, linkService, notificationService, projectService, urlService) {
      var _eventId = $stateParams.id;
      var _knownDataKeys = ['error', 'simple_error', 'request', 'environment', 'user', 'user_description', 'version'];
      var vm = this;

      function addHotKeys() {
        hotkeys.add({
          combo: 'ctrl+up',
          description: 'Go To Stack',
          callback: function () {
            $state.go('app.stack', { id: vm.event.stack_id });
          }
        });

        if (vm.previous) {
          hotkeys.add({
            combo: 'ctrl+left',
            description: 'Previous Occurrence',
            callback: function () {
              $state.go('app.event', { id: vm.previous, tab: vm.getCurrentTab() });
            }
          });
        }

        if (vm.next) {
          hotkeys.add({
            combo: 'ctrl+right',
            description: 'Next Occurrence',
            callback: function () {
              $state.go('app.event', { id: vm.next, tab: vm.getCurrentTab() });
            }
          });
        }

      }

      function buildTabs(tabNameToActivate) {
        var tabs = [{title: 'Overview', template_key: 'overview'}];

        if (isError()) {
          if (vm.event.data['@error']) {
            tabs.push({title: 'Exception', template_key: 'error'});
          } else if (vm.event.data['@simple_error']) {
            tabs.push({title: 'Exception', template_key: 'simple-error'});
          }
        }

        if (hasRequestInfo()) {
          tabs.push({title: 'Request', template_key: 'request'});
        }

        if (hasEnvironmentInfo()) {
          tabs.push({title: 'Environment', template_key: 'environment'});
        }

        var extendedDataItems = [];
        angular.forEach(vm.event.data, function(data, key) {
          if (key === '@trace') {
            key = 'Trace Log';
          }

          if (key.startsWith('@')) {
            return;
          }

          if (isPromoted(key)) {
            tabs.push({ title: key, template_key: 'promoted', data: data});
          } else if (_knownDataKeys.indexOf(key) < 0) {
            extendedDataItems.push({title: key, data: data});
          }
        }, tabs);

        if (extendedDataItems.length > 0) {
          tabs.push({title: 'Extended Data', template_key: 'extended-data', data: extendedDataItems});
        }

        for(var index = 0; index < tabs.length; index++) {
          if (tabs[index].title !== tabNameToActivate) {
            continue;
          }

          tabs[index].active = true;
          break;
        }

        vm.tabs = tabs;
      }

      function demoteTab(tabName) {
        function onSuccess() {
          vm.project.promoted_tabs.splice(indexOf, 1);
          buildTabs('Extended Data');
        }

        function onFailure() {
          notificationService.error('An error occurred promoting tab.');
        }

        var indexOf = vm.project.promoted_tabs.indexOf(tabName);
        if (indexOf < 0) {
          return;
        }

        return projectService.demoteTab(vm.project.id, tabName).then(onSuccess, onFailure);
      }

      function getCurrentTab() {
        var tab = vm.tabs.filter(function(t) { return t.active; })[0];
        return tab ? tab.title : null;
      }

      function getErrorType() {
        if (vm.event.data['@error']) {
          var type = errorService.getTargetInfoExceptionType(vm.event.data['@error']);
          if (type) {
            return type;
          }
        }

        if (vm.event.data['@simple_error']) {
          return vm.event.data['@simple_error'].type;
        }

        return 'Unknown';
      }

      function getEvent() {
        removeHotKeys();

        function onSuccess(response) {
          vm.event = response.data.plain();

          var links = linkService.getLinks(response.headers('link'));
          vm.previous = links['previous'] ? links['previous'].split('/').pop() : null;
          vm.next = links['next'] ? links['next'].split('/').pop() : null;

          addHotKeys();

          return vm.event;
        }

        function onFailure() {
          $state.go('app.dashboard');
          notificationService.error('The event "' + $stateParams.id + '" could not be found.');
        }

        if (!_eventId) {
          onFailure();
        }

        return eventService.getById(_eventId).then(onSuccess, onFailure);
      }

      function getMessage() {
        if (vm.event && vm.event.data && vm.event.data['@error']) {
          var message = errorService.getTargetInfoMessage(vm.event.data['@error']);
          if (message) {
            return message;
          }
        }

        return vm.event.message;
      }

      function getProject() {
        function onSuccess(response) {
          vm.project = response.data.plain();
          vm.project.promoted_tabs = vm.project.promoted_tabs || [];
          return vm.project;
        }

        function onFailure() {
          $state.go('app.dashboard');
        }

        if (!vm.event || !vm.event.project_id) {
          onFailure();
        }

        return projectService.getById(vm.event.project_id, true).then(onSuccess, onFailure);
      }

      function getRequestUrl() {
        var request = vm.event.data['@request'];
        return urlService.buildUrl(request.is_secure, request.host, request.port, request.path, request.query_string);
      }

      function getVersion() {
        return vm.event.data['@version'];
      }

      function hasCookies() {
        return !!vm.event.data['@request'].cookies && Object.keys(vm.event.data['@request'].cookies).length > 0;
      }

      function hasEnvironmentInfo() {
        return vm.event.data && vm.event.data['@environment'];
      }

      function hasIdentity() {
        return vm.event.data && vm.event.data['@user'] && vm.event.data['@user'].identity;
      }

      function hasIPAddress() {
        return hasRequestInfo() && vm.event.data['@request'].client_ip_address && vm.event.data['@request'].client_ip_address.length > 0;
      }

      function hasLevel() {
        return vm.event.data && vm.event.data['@level'];
      }

      function hasReferrer() {
        return vm.event.data && vm.event.data['@request'] && vm.event.data['@request'].referrer;
      }

      function hasRequestInfo() {
        return vm.event.data && vm.event.data['@request'];
      }

      function hasUserAgent() {
        return vm.event.data && vm.event.data['@request'] && vm.event.data['@request'].user_agent;
      }

      function hasUserEmail() {
        return vm.event.data && vm.event.data['@user_description'] && vm.event.data['@user_description'].email_address;
      }

      function hasUserDescription() {
        return vm.event.data && vm.event.data['@user_description'] && vm.event.data['@user_description'].description;
      }

      function hasTags() {
        return vm.event.tags && vm.event.tags.length > 0;
      }

      function hasVersion() {
        return vm.event.data && vm.event.data['@version'];
      }

      function isError() {
        return vm.event.type === 'error';
      }

      function isLevelSuccess() {
        var level = hasLevel() ? vm.event.data['@level'].toLowerCase() : null;
        return level === 'trace' || level === 'debug';
      }

      function isLevelInfo() {
        return hasLevel() && vm.event.data['@level'].toLowerCase() === 'info';
      }

      function isLevelWarning() {
        return hasLevel() && vm.event.data['@level'].toLowerCase() === 'warn';
      }

      function isLevelError() {
        return hasLevel() && vm.event.data['@level'].toLowerCase() === 'error';
      }

      function isPromoted(tabName) {
        if (!vm.project || !vm.project.promoted_tabs) {
          return false;
        }

        return vm.project.promoted_tabs.filter(function (tab) { return tab === tabName; }).length > 0;
      }

      function promoteTab(tabName) {
        function onSuccess(response) {
          vm.project.promoted_tabs.push(tabName);
          buildTabs(tabName);
        }

        function onFailure() {
          notificationService.error('An error occurred promoting tab.');
        }

        return projectService.promoteTab(vm.project.id, tabName).then(onSuccess, onFailure);
      }

      function removeHotKeys() {
        hotkeys.del('ctrl+up');
        hotkeys.del('ctrl+left');
        hotkeys.del('ctrl+right');
      }

      $scope.$on('$destroy', removeHotKeys);

      vm.demoteTab = demoteTab;
      vm.event = {};
      vm.getCurrentTab = getCurrentTab;
      vm.getErrorType = getErrorType;
      vm.getMessage = getMessage;
      vm.getRequestUrl = getRequestUrl;
      vm.getVersion = getVersion;
      vm.hasCookies = hasCookies;
      vm.hasIdentity = hasIdentity;
      vm.hasLevel = hasLevel;
      vm.hasReferrer = hasReferrer;
      vm.hasRequestInfo = hasRequestInfo;
      vm.hasTags = hasTags;
      vm.hasUserDescription = hasUserDescription;
      vm.hasUserEmail = hasUserEmail;
      vm.hasVersion = hasVersion;
      vm.isError = isError;
      vm.isLevelSuccess = isLevelSuccess;
      vm.isLevelInfo = isLevelInfo;
      vm.isLevelWarning = isLevelWarning;
      vm.isLevelError = isLevelError;
      vm.isPromoted = isPromoted;
      vm.project = {};
      vm.promoteTab = promoteTab;
      vm.tabs = [];

      getEvent().then(getProject).then(function() { buildTabs($stateParams.tab); });
    }]);
}());
