$(document).ready(function () {

    //#region Check password if meets password standards
    $('#NewPassword').on('keyup', function () {
        var NewPass = $(this).val();
        var iconNewPass = $('#IconNewPass');
        var inputNewPass = $('#NewPassword');

        // Regular expressions to match the criteria
        var lengthRegex = /^.{8,64}$/;
        var upperCaseRegex = /[A-Z]/;
        var lowerCaseRegex = /[a-z]/;
        var numberRegex = /[0-9]/;
        var specialCharRegex = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/;

        // Update icons for each criteria    
        updateIcon("Upper", upperCaseRegex.test(NewPass));
        updateIcon("Lower", lowerCaseRegex.test(NewPass));
        updateIcon("Special", specialCharRegex.test(NewPass));
        updateIcon("Num", numberRegex.test(NewPass));
        updateIcon("Length", lengthRegex.test(NewPass));


        if (lengthRegex.test(NewPass) && upperCaseRegex.test(NewPass) && lowerCaseRegex.test(NewPass) &&
            numberRegex.test(NewPass) && specialCharRegex.test(NewPass)) {
            //equal
            inputNewPass.css("background-color", "#CDFADB");
            iconNewPass.removeClass("fa-times").addClass("fa-check");
            iconNewPass.css("color", "green");

        } else {
            // not equal
            inputNewPass.css("background-color", "#FFACAC");
            iconNewPass.removeClass("fa-check").addClass("fa-times");
            iconNewPass.css("color", "red");
        }
    });
    //#endregion

    //#region Check re-type password if match to new password
    $('#CPassword').on('keyup', function () {
        var ConfirmPass = $(this).val();
        var NewPass = $('#NewPassword').val();
        var iconConfirmPass = $('#IconConfirmPass');
        var inputConfirmPass = $('#CPassword');

        // Regular expressions to match the criteria
        var lengthRegex = /^.{8,64}$/;
        var upperCaseRegex = /[A-Z]/;
        var lowerCaseRegex = /[a-z]/;
        var numberRegex = /[0-9]/;
        var specialCharRegex = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/;

        if ((lengthRegex.test(ConfirmPass) && upperCaseRegex.test(ConfirmPass) && lowerCaseRegex.test(ConfirmPass) &&
            numberRegex.test(ConfirmPass) && specialCharRegex.test(ConfirmPass))) {
            //meet requirements
            if (ConfirmPass != NewPass) {
                //not equal
                inputConfirmPass.css("background-color", "#FFACAC");
                iconConfirmPass.removeClass("fa-check").addClass("fa-times");
                iconConfirmPass.css("color", "red");
            } else {
                // equal
                inputConfirmPass.css("background-color", "#CDFADB");
                iconConfirmPass.removeClass("fa-times").addClass("fa-check");
                iconConfirmPass.css("color", "green");
            }
        } else {
            inputConfirmPass.css("background-color", "#FFACAC");
            iconConfirmPass.removeClass("fa-check").addClass("fa-times");
            iconConfirmPass.css("color", "red");
        }
    });
    //#endregion

});

//#region updateIcon
function updateIcon(iconId, isValid) {
    var iconElement = $("#" + iconId);
    if (isValid) {
        iconElement.removeClass("fa-times").addClass("fa-check");
        iconElement.css("color", "green")
    } else {
        iconElement.removeClass("fa-check").addClass("fa-times");
        iconElement.css("color", "dimgray")
    }
}
//#endregion

//#region 'SuccessMessage'
function SuccessMessage(message) {
    Swal.fire({
        title: 'Success',
        text: message,
        icon: 'success',
        confirmButtonText: 'OK'
    });
}
//#endregion

//#region 'ErrorMessage'
function ErrorMessage(message) {
    Swal.fire({
        title: 'Error',
        text: message,
        icon: 'error',
        confirmButtonText: 'OK'
    });
}
//#endregion

//#region CheckInputs()
function CheckInputs() {
    var IconCP = $('#IconCP');
    var iconNewPass = $('#IconNewPass');
    var iconConfirmPass = $('#IconConfirmPass');

    if (IconCP.hasClass("fa-times")) {
        ErrorMessage('Wrong current password');
    } else if (iconNewPass.hasClass("fa-times")) {
        ErrorMessage('New password did not meet requirements.');
    } else if (iconConfirmPass.hasClass("fa-times")) {
        ErrorMessage('Passwords do not match.');
    } else {
        ChangePassword();
    }
}
//#endregion

//#region ChangePassword()
function ChangePassword() {
    var form = $('#ChangePasswordForm')[0];
    var formData = new FormData(form);

    var operation = $('#Operation').val();
    formData.append('Operation', operation);

    $.ajax({
        url: '/Home/ChangePassword',
        type: 'POST',
        data: formData,
        contentType: false,
        processData: false,
        success: function (response) {
            if (operation == "ModalChangePass") {
                Swal.fire({
                    title: 'Success',
                    text: response,
                    icon: 'success',
                    confirmButtonText: 'OK'
                }).then(() => {
                    Close();
                });
            } else {
                window.location.href = response.redirectUrl;
            }
        },
        error: function (xhr) {
            Swal.fire({
                title: 'Error',
                text: xhr.responseText,
                icon: 'error',
                confirmButtonText: 'OK'
            });
        }
    });
}
//#endregion

//#region 'Close Modal'
function Close() {
    $('#ChangePasswordForm')[0].reset();

    //Remove color of inputs
    $('#CPassword').css('background-color', 'transparent');
    $('#NewPassword').css('background-color', 'transparent');
    updateIcon("Upper", "");
    updateIcon("Lower", "");
    updateIcon("Special", "");
    updateIcon("Num", "");
    updateIcon("Length", "");

    // Hide the modal
    $('#ChangePasswordModal').modal('hide');
}
//#endregion

//#region 'Open Modal for Add'
function OpenModal() {
    $('#ChangePasswordModal').modal('show');
}
//#endregion

//#region 'SaveUserDetails'
function SaveUserDetails() {
    var newEmployeeName = $('#EmployeeName').val().trim();
    var newPlantNo = $('#PlantNoSelect').val();

    $.ajax({
        url: '/Admin/ChangeProfileDetails',
        type: 'POST',
        data: { EmployeeName: newEmployeeName, PlantNo: newPlantNo },
        success: function (response) {
            Swal.fire({
                title: 'Success',
                text: response,
                icon: 'success',
                confirmButtonText: 'OK'
            }).then(() => {
                location.reload();
            });
        },
        error: function (xhr) {
            ErrorMessage(xhr.responseText);
        }
    });


}
//#endregion
