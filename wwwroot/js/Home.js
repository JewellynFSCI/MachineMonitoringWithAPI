$(document).ready(function () {

});


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

//#region 'Submit - Login'
function Submit() {
    var form = $('#LoginForm')[0];
    var formData = new FormData(form);

    $.ajax({
        url: '/Home/LoginUser',
        type: 'POST',
        data: formData,
        contentType: false,
        processData: false,
        success: function (data) {
            if (data.success) {
                window.location.href = data.redirectUrl;
            } else {
                ErrorMessage(data.message);
            }
        },
        error: function (xhr) {
            var message = xhr.responseText;
            ErrorMessage(message);
        }
    });
}
//#endregion