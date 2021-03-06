(function () {
  'use strict';

  angular.module('app.organization')
    .controller('organization.List', ['$rootScope', '$scope', '$window', '$state', 'billingService', 'dialogs', 'dialogService', 'linkService', 'notificationService', 'organizationService', 'paginationService', function ($rootScope, $scope, $window, $state, billingService, dialogs, dialogService, linkService, notificationService, organizationService, paginationService) {
      var settings = {limit: 10, mode: 'summary'};
      var vm = this;

      function add() {
        return dialogs.create('app/organization/list/add-organization-dialog.tpl.html', 'AddOrganizationDialog as vm').result.then(createOrganization);
      }

      function createOrganization(name) {
        function onSuccess(response) {
          vm.organizations.push(response.data.plain());
        }

        function onFailure(response) {
          if (response.status === 426) {
            return billingService.confirmUpgradePlan(response.data.message).then(function () {
              return createOrganization(name);
            });
          }

          var message = 'An error occurred while creating the organization.';
          if (response.data && response.data.message) {
            message += ' Message: ' + response.data.message;
          }

          notificationService.error(message);
        }

        return organizationService.create(name).then(onSuccess, onFailure);

      }

      function get(options, useCache) {
        function onSuccess(response) {
          vm.organizations = response.data.plain();

          var links = linkService.getLinksQueryParameters(response.headers('link'));
          vm.previous = links['previous'];
          vm.next = links['next'];

          vm.pageSummary = paginationService.getCurrentPageSummary(response.data, vm.currentOptions.page, vm.currentOptions.limit);

          if (vm.organizations.length === 0 && vm.currentOptions.page && vm.currentOptions.page > 1) {
            return get(null, useCache);
          }

          return vm.organizations;
        }

        vm.currentOptions = options || settings;
        return organizationService.getAll(vm.currentOptions, useCache).then(onSuccess);
      }

      function leave(organization, user) {
        return dialogService.confirmDanger('Are you sure you want to leave this organization?', 'LEAVE ORGANIZATION').then(function () {
          function onSuccess() {
            vm.organizations.splice(vm.organizations.indexOf(organization), 1);
          }

          function onFailure(response) {
            var message = 'An error occurred while trying to leave the organization.';
            if (response.status === 400) {
              message += ' Message: ' + response.data.message;
            }

            notificationService.error(message);
          }

          return organizationService.removeUser(organization.id, user.email_address).then(onSuccess, onFailure);
        });
      }

      function open(id, event) {
        if (event.ctrlKey || event.which === 2) {
          $window.open($state.href('app.organization.manage', { id: id }, { absolute: true }), '_blank');
        } else {
          $state.go('app.organization.manage', { id: id });
        }

        event.preventDefault();
      }

      function nextPage() {
        return get(vm.next);
      }

      function previousPage() {
        return get(vm.previous);
      }

      function remove(organization) {
        return dialogService.confirmDanger('Are you sure you want to delete this organization?', 'DELETE ORGANIZATION').then(function () {
          function onSuccess() {
            vm.organizations.splice(vm.organizations.indexOf(organization), 1);
          }

          function onFailure(response) {
            var message = 'An error occurred while trying to delete the organization.';
            if (response.status === 400) {
              message += ' Message: ' + response.data.message;
            }

            notificationService.error(message);
          }

          return organizationService.remove(organization.id).then(onSuccess, onFailure);
        });
      }

      vm.add = add;
      vm.get = get;
      vm.leave = leave;
      vm.nextPage = nextPage;
      vm.open = open;
      vm.organizations = [];
      vm.previousPage = previousPage;
      vm.remove = remove;

      get();
    }
    ]);
}());
