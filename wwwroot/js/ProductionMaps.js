$(document).ready(function () {
    GetProductionMaps();
});

//#region 'GetProductionMaps'
function GetProductionMaps() {
    $('#tblData').DataTable().page(0).draw('page');

    $.ajax({
        url: '/Admin/GetProductionMaps',
        type: 'GET',
        contentType: 'application/json',
        success: function (locationList) {
            $('#tblData').DataTable({
                data: locationList.locationList,
                destroy: true, // allows re-initialization
                paging: false, // disables pagination
                //searching: false, // disables the search bar
                info: false, // disables the "Showing x to y of z entries" text
                lengthChange: false, // disables the entries dropdown
                columns: [
                    { data: 'productionMapId', width: "10%" },
                    { data: 'productionMapName', width: "30%" },
                    { data: 'plantName', width: "15%" },
                    { data: 'imgName', width: "25%" },
                    {
                        data: null,
                        render: function (data, type, row) {
                            // Escape single quotes to avoid breaking HTML attributes
                            const nameEscaped = row.productionMapName.replace(/'/g, "\\'");
                            const plantEscaped = row.plantName.replace(/'/g, "\\'");
                            const imgEscaped = row.imgName.replace(/'/g, "\\'");

                            return `
                                    <div class="btn-group w-100" role="group">
                                        <button class="btn btn-danger" onclick="deletemap('${row.productionMapId}','${nameEscaped}','${imgEscaped}')">
                                            <i class="fas fa-trash"></i> Delete
                                        </button>
                                        <button class="btn btn-primary" onclick="EditProdMapModal('${row.productionMapId}', '${nameEscaped}', '${plantEscaped}', '${imgEscaped}')">
                                            <i class="fas fa-pencil-alt"></i> Edit
                                        </button>
                                    </div>`;
                        }, width: "20%"


                    }
                ]
            });
        },
        error: function (xhr, status, error) {
            Swal.fire({
                title: 'Error',
                text: 'An error occurred: ' + error,
                icon: 'error',
                confirmButtonText: 'OK'
            });
        }
    });
}
//#endregion

//#region GetPlantNo
function GetPlantNo(callback) {
    var dropdownPlantNo = $("#PlantNo");
    dropdownPlantNo.empty();

    $.ajax({
        url: '/Admin/GetPlantNo',
        type: 'GET',
        contentType: 'application/json',
        success: function (response) {
            const plantNos = response.plantnos || response;

            dropdownPlantNo.append("<option value='' disabled selected><--Select Plant No--></option>");
            $.each(plantNos, function (index, item) {
                dropdownPlantNo.append(
                    $('<option></option>').val(item.plantNo).text(item.plantName)
                );
            });

            if (callback) callback();
        },
        error: function (xhr, status, error) {
            Swal.fire({
                title: 'Error',
                text: 'Error loading Plant Nos: ' + error,
                icon: 'error',
                confirmButtonText: 'OK'
            });
        }
    });
}
//#endregion

//#region 'Set function for save button of modal'
function SetupSaveButton() {
    var operation = $("#Operation").val().trim(); // "Add" or "Edit"
    //var button = $("#saveButton");

    if (operation === "Edit") {
        EditData();
    } else {
        UploadProdMap();
    }
}
//#endregion

//#region 'Open Modal for Add'
function OpenAddModal() {
    $('#ProdMapModal').modal('show');
    $('#prodMapModalTitle').text("Add Production Map");
    $('#saveButton').text("Save");
    $('#Operation').val("Add");
    $('#ProductionMapId').val("");
    $('#ProductionMapName').val("");
    $('#ImgFile').val("");
    $('#fileNote').text("");
    $('#ImgFile').val('');
    $('.custom-file-label').text('Upload File');
    $('#ImgContainer').hide();
    $('#ProdMapIdContainer').hide();

    GetPlantNo(function () {
        $('#PlantNo').val('');
    });
}
//#endregion

//#region 'Open Modal for Edit'
function EditProdMapModal(productionMapId, productionMapName, plantName, imgName) {
    $('#ProdMapModal').modal('show');
    $('#prodMapModalTitle').text("Update Production Map");
    $('#saveButton').text("Save Changes");
    $('#Operation').val("Edit");
    $('#ProductionMapId').val(productionMapId);
    $('#ProductionMapName').val(productionMapName);
    $('#ImgFile').val("");
    $('#fileNote').text("(if want to replace)");
    $('#ImgContainer').show();
    $('#ImgContainer img').attr('src', 'img/productionmap/' + imgName, 'alt', imgName);
    $('#ImgName').val(imgName);
    $('#ProdMapIdContainer').show();

    GetPlantNo(function () {
        $('#PlantNo option').filter(function () {
            return $(this).text().trim() === plantName.trim();
        }).prop('selected', true);
    });
}
//#endregion

//#region 'Close Modal'
function Close() {
    // Get the form inside the modal by ID or jQuery selector
    var form = $('#ProdMapModal').find('form')[0];

    if (form) {
        form.reset(); // reset all form fields

        // Reset custom file label text
        $('#ImgFile').next('.custom-file-label').text('Upload File');

        // Clear file note
        $('#fileNote').text('');
    }

    // Hide the modal
    $('#ProdMapModal').modal('hide');

    // Refresh data
    GetProductionMaps();
}
//#endregion

//#region 'UploadProdMap'
function UploadProdMap() {
    var form = $('#ProdMapModal').find('form')[0]; // Get the form element

    // Access form fields using form.fieldName
    var PlantNo = form.PlantNo.value.trim();
    var ProdMapName = form.ProductionMapName.value.trim();
    var ImgFileInput = form.ImgFile;
    var isEdit = form.Operation.value === "Edit";

    // Simple validation
    if (!PlantNo || !ProdMapName || (!isEdit && ImgFileInput.files.length === 0)) {
        Swal.fire({
            title: 'Error',
            text: 'Please complete all fields and select a file.',
            icon: 'error',
            confirmButtonText: 'OK'
        });
        return;
    }

    var formData = new FormData(form);  // Includes all inputs, including files

    $.ajax({
        url: '/Admin/UploadProdMap',
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
                text: xhr.responseText,
                icon: 'error',
                confirmButtonText: 'OK'
            });
        }
    });
}

//#endregion

//#region 'Delete Production Map'
function deletemap(productionMapId, productionMapName, imgName) {
    Swal.fire({
        title: 'Are you sure you want to delete Production Map ID ' + productionMapId + ' - ' + productionMapName ,
        text: "You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, do it!'
    }).then((result) => {
        if (result.isConfirmed) {
            $.ajax({
                url: '/Admin/DeleteMap',
                type: 'POST',
                data: { ProductionMapId: productionMapId, ImgName: imgName },
                success: function (response) {
                    Swal.fire({
                        title: 'Done!',
                        text: response,
                        icon: 'success',
                        confirmButtonText: 'OK'
                    }).then(() => {
                        GetProductionMaps();
                    });
                },
                error: function (xhr, status, error) {
                    Swal.fire({
                        title: 'Error!',
                        text: error,
                        icon: 'error',
                        confirmButtonText: 'OK'
                    });
                }
            });
        }
    });
}
//#endregion

//#region 'EditData'
function EditData() {
    var form = $('#ProdMapModal').find('form')[0]; // Get the form element

    // Access form fields using form.fieldName
    var PlantNo = form.PlantNo.value.trim();
    var ProdMapName = form.ProductionMapName.value.trim();
    var ImgFileInput = form.ImgFile;
    var isAdd = form.Operation.value === "Add";

    // Simple validation
    if (!PlantNo || !ProdMapName || (!isAdd  === 0)) {
        Swal.fire({
            title: 'Error',
            text: 'Please complete all fields.',
            icon: 'error',
            confirmButtonText: 'OK'
        });
        return;
    }

    var formData = new FormData(form);  // Includes all inputs, including files

    $.ajax({
        url: '/Admin/UpdateProdMap',
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
                text: xhr.responseText,
                icon: 'error',
                confirmButtonText: 'OK'
            });
        }
    });

}
//#endregion
