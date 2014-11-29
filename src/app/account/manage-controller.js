(function () {
  'use strict';

  angular.module('app.account')
    .controller('account.Manage', ['featureService', 'notificationService', 'projectService', 'userService', function (featureService, notificationService, projectService, userService) {
      var vm = this;

      function changePassword(isValid) {
        if (!isValid) {
          return;
        }

        // TODO: implement change password.
      }

      function getEmailNotificationSettings() {
        function onSuccess(response) {
          vm.emailNotificationSettings = response.data.plain();
          return vm.emailNotificationSettings;
        }

        function onFailure() {
          notificationService.error('An error occurred while loading the notification settings.');
        }

        vm.emailNotificationSettings = null;
        return projectService.getNotificationSettings(vm.currentProject.id, vm.user.id).then(onSuccess, onFailure);
      }

      function getProjects() {
        function onSuccess(response) {
          vm.projects = response.data.plain();
          return vm.projects;
        }

        function onFailure() {
          notificationService.error('An error occurred while loading the projects.');
        }

        return projectService.getAll().then(onSuccess, onFailure);
      }

      function getUser() {
        function onSuccess(response) {
          vm.user = response.data.plain();
          return vm.user;
        }

        function onFailure() {
          notificationService.error('An error occurred while loading your user profile.');
        }

        return userService.get().then(onSuccess, onFailure);
      }

      function hasPremiumFeatures() {
        return featureService.hasPremium();
      }

      function hasProjects() {
        return vm.projects.length > 0;
      }

      function hasEmailNotifications() {
        return vm.user.enable_email_notifications && vm.emailNotificationSettings;
      }

      function hasPremiumEmailNotifications() {
        return hasEmailNotifications() && hasPremiumFeatures();
      }

      function resendVerificationEmail() {
        function onFailure() {
          notificationService.error('An error occurred while sending your verification email.');
        }

        return userService.resendVerificationEmail(vm.user.id).catch(onFailure);
      }

      function saveEmailAddress(isValid) {
        if (isValid) {
          return;
        }

        function onSuccess(response) {
          vm.user.is_email_address_verified = response.data.is_verified;
        }

        function onFailure() {
          notificationService.error('An error occurred while saving your email address.');
        }

        return userService.updateEmailAddress(vm.user.id, vm.user.email_address).then(onSuccess, onFailure);
      }

      function saveEmailNotificationSettings() {
        function onFailure() {
          notificationService.error('An error occurred while saving your notification settings.');
        }

        return projectService.setNotificationSettings(vm.currentProject.id, vm.user.id, vm.emailNotificationSettings).catch(onFailure);
      }

      function saveEnableEmailNotification() {
        function onFailure() {
          notificationService.error('An error occurred while saving your email notification preferences.');
        }

        return userService.update(vm.user.id, { enable_email_notifications: vm.user.enable_email_notifications }).catch(onFailure);
      }


      function saveUser(isValid) {
        if (!isValid) {
          return;
        }

        function onFailure() {
          notificationService.error('An error occurred while saving your full name.');
        }

        return userService.update(vm.user.id, vm.user).catch(onFailure);
      }

      vm.changePassword = changePassword;
      vm.currentProject = {};
      vm.emailNotificationSettings = null;
      vm.getEmailNotificationSettings = getEmailNotificationSettings;
      vm.hasEmailNotifications = hasEmailNotifications;
      vm.hasPremiumEmailNotifications = hasPremiumEmailNotifications;
      vm.hasPremiumFeatures = hasPremiumFeatures;
      vm.hasProjects = hasProjects;
      vm.password = {};
      vm.projects = [];
      vm.resendVerificationEmail = resendVerificationEmail;
      vm.saveEmailAddress = saveEmailAddress;
      vm.saveEmailNotificationSettings = saveEmailNotificationSettings;
      vm.saveEnableEmailNotification = saveEnableEmailNotification;
      vm.saveUser = saveUser;
      vm.user = {};

      getUser().then(getProjects);
    }]);
}());
