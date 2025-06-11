$(document).ready(function () {
	$('#tblData').DataTable({
        paging: false,
        info: false,
        lengthChange: false,
	});
});


//#region 'DeleteUser'
function DeleteUser(EmployeeNo) {
    Swal.fire({
        title: 'Are you sure you want to delete this user?',
        text: "You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, do it!'
    }).then((result) => {
        if (result.isConfirmed) {
            $.ajax({
                url: '/Admin/DeleteUser',
                type: 'POST',
                data: { EmployeeNo : EmployeeNo },
                success: function (response) {
                    Swal.fire({
                        title: 'Done!',
                        text: response,
                        icon: 'success',
                        confirmButtonText: 'OK'
                    }).then(() => {
                        reloadUserTable();
                    });
                },
                error: function (xhr, status, error) {
                    Swal.fire({
                        title: 'Error!',
                        text: xhr.responseText,
                        icon: 'error',
                        confirmButtonText: 'OK'
                    });
                }
            });
        }
    });
}
//#endregion

//#region 'reloadUserTable'
function reloadUserTable() {
    $.ajax({
        url: '/Admin/RefreshUserTable',
        type: 'GET',
        success: function (data) {
            $('#userTableBody').html(data);
        },
        error: function (xhr) {
            console.error("Failed to reload user table:", xhr.responseText);
        }
    });
}
//#endregion

//#region 'OpenAddModal'
function OpenAddModal() {
    $('#UserModal').modal('show');
    $('#UserModalTitle').text("Add New User");
    $('#sumbitButton').text("Save");
    $('#Operation').val("Add");
    $('#EmployeeNo').val("");
    $('#EmployeeNo').removeAttr('readonly');
    $('#EmployeeName').val("");
    $('#EmployeeName').removeAttr('readonly');
}
//#endregion

//#region 'OpenEditModal'
function OpenEditModal(EmployeeNo, EmployeeName, AuthorityLevel,PlantNo) {
    $('#UserModal').modal('show');
    $('#UserModalTitle').text("Edit Employee Data");
    $('#sumbitButton').text("Update");
    $('#Operation').val("Edit");
    $('#EmployeeNo').val(EmployeeNo);
    $('#EmployeeNo').attr('readonly',true);
    $('#EmployeeName').val(EmployeeName);

    var currentsession = $('#currentSessionEmpNo').val();
    if (currentsession == EmployeeNo) {
        $('#EmployeeName').attr('readonly', true);
    } else {
        $('#EmployeeName').removeAttr('readonly');
    }
    $('#AuthorityLevel').val(AuthorityLevel);
    $('#PlantNo').val(PlantNo);
}
//#endregion

//#region 'Close Modal'
function Close() {
    // Get the form inside the modal by ID or jQuery selector
    var form = $('#UserModal').find('form')[0];

    if (form) {
        form.reset(); // reset all form fields
    }

    // Refresh data
    reloadUserTable();

    // Hide the modal
    $('#UserModal').modal('hide');   
}
//#endregion

//#region 'SaveUser'
function SaveUser() {
    var form = $('#UserModal').find('form')[0];
    var formData = new FormData(form);

    $.ajax({
        url: '/Admin/AddNewUser',
        type: 'POST',
        data: formData,
        contentType: false,
        processData: false,
        success: function (response) {
            Swal.fire({
                title: 'Success',
                text: response,
                icon: 'success',
                confirmButtonText: 'OK'
            }).then(() => {
                Close();
            });
        },
        error: function (xhr) {
            Swal.fire({
                title: 'Error',
                html: xhr.responseText,
                icon: 'error',
                confirmButtonText: 'OK'
            });
        }
    });
}
//#endregion

