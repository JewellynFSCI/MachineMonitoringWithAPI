let map;              // global map variable
let markers = [];     // global markers array
let tempCoordinate = null; // temporary coordinate

var productionMaps = [];
var coordinates = [];

$(document).ready(function () {
    GetPlantNo();
    GetProductionMap();
    GetImgNamefromDb();
});

//#region GetPlantNo
function GetPlantNo() {
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
        },
        error: function (xhr, status, error) {
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

//#region 'Get List of Production Map'
function GetProductionMap() {
    $("#PlantNo").on("change", function () {
        var SelectedPlantNo = $(this).val();
        var dropdownProdMapName = $("#ProductionMapName");
        dropdownProdMapName.empty();

        // Reset the map container safely
        if (window.map instanceof ol.Map) {
            window.map.setTarget(null); // Detach map from DOM
            window.map = null;
        }
        $('#map').empty(); // Clear map div contents

        $.ajax({
            url: '/Admin/GetProductionMaps',
            type: 'GET',
            data: { PlantNo: SelectedPlantNo },
            contentType: 'application/json',
            success: function (response) {
                productionMaps = response.locationList || []; //save globally

                // Add default disabled option
                dropdownProdMapName.append("<option value='' disabled selected><--Select Production Map Name--></option>");

                // Loop through the response
                $.each(response.locationList, function (index, item) {
                    dropdownProdMapName.append(
                        $('<option></option>').val(item.productionMapId).text(item.productionMapName)
                    );
                });
            },
            error: function (xhr, status, error) {
                Swal.fire({
                    title: 'Error',
                    text: xhr.responseText || "Failed to load production maps.",
                    icon: 'error',
                    confirmButtonText: 'OK'
                });
            }
        });
    });
}

//#endregion

//#region 'Get Image Name from db'
function GetImgNamefromDb() {
    $("#ProductionMapName").on("change", function () {
        var SelectedProdMapId = $(this).val();

        if (!productionMaps || productionMaps.length === 0) {
            $('#map').text('No image retrieved.');
            return;
        }

        var GetImgName = productionMaps.find(x => x.productionMapId == SelectedProdMapId);
        if (GetImgName && GetImgName.imgName) {
            //$('#map').attr('data-image', `/img/productionmap/${GetImgName.imgName}`);
            var ImgName = GetImgName.imgName;
            ShowImage(ImgName);
        } else {
            $('#map').html('<p>No image retrieved.</p>');
        }
    });
}
//#endregion

//#region 'ShowImage'
function ShowImage(ImgName) {
    const imageUrl = 'img/productionmap/' + ImgName;

    // Reset the map container safely
    if (window.map instanceof ol.Map) {
        window.map.setTarget(null); // Detach map from DOM
        window.map = null;
    }
    $('#map').empty(); // Clear map div contents

    // Load image and initialize map once loaded
    const img = new Image();
    img.onload = function () {
        const imageWidth = img.naturalWidth;
        const imageHeight = img.naturalHeight;

        const imageExtent = [0, 0, imageWidth, imageHeight];

        const imageLayer = new ol.layer.Image({
            source: new ol.source.ImageStatic({
                url: imageUrl,
                imageExtent: imageExtent,
                projection: 'PIXELS'
            })
        });

        const pixelProjection = new ol.proj.Projection({
            code: 'PIXELS',
            units: 'pixels',
            extent: imageExtent
        });

        const view = new ol.View({
            projection: pixelProjection,
            center: [imageWidth / 2, imageHeight / 2],
            zoom: 1,
            maxZoom: 5
        });

        window.map = new ol.Map({
            layers: [imageLayer],
            target: 'map',
            view: view
        });

        view.fit(imageExtent);

        // Unbind previous click handler before adding a new one
        window.map.un('click', handleMapClick);
        window.map.on('click', handleMapClick);

    };
    img.src = imageUrl;
}
//#endregion

// #region 'Separate click handler for clarity and control'
function handleMapClick(evt) {
    coordinates = evt.coordinate;
    $('#ProdMapModal').modal('show');
}
//#endregion





//#region 'SaveCoordinatesToDb'
function SaveCoordsToDb(map, coordinate, markers) {
    tempCoordinate = coordinate; // Save the clicked coordinate
   
//#endregion




//#region 'Handle modal "Save Marker" button click'
$('#save-marker-btn').on('click', function () {
    const name = $('#recipient-name').val();
    const message = $('#message-text').val();

    if (!name || !message) {
        alert("Please fill out all fields.");
        return;
    }

    $('#MachineInfoModal').modal('hide');

    addMarkerWithPopup(map, tempCoordinate, name, message, markers);

    $('#recipient-name').val('');
    $('#message-text').val('');
});
//#endregion



//#region 'Add marker'
function addMarkerWithPopup(map, coordinate, markers) {
    const $markerEl = $('<div></div>')
        .css({
            position: 'absolute',
            background: 'blue',
            width: '12px',
            height: '12px',
            //borderRadius: '50%',
            cursor: 'pointer'
        })
    //.attr('title', `Name: ${name}\nMessage: ${message}`); // Tooltip

    const marker = new ol.Overlay({
        position: coordinate,
        element: $markerEl[0],
        positioning: 'center-center'
    });

    $markerEl.on('click', function (event) {
        event.stopPropagation(); // Prevent triggering map click
        removeMarker(map, marker, markers);
    });

    map.addOverlay(marker);
    markers.push(marker);
}
//#endregion




//#region 'Remove marker'
function removeMarker(map, marker, markers) {
    map.removeOverlay(marker);
    const index = markers.indexOf(marker);
    if (index !== -1) {
        markers.splice(index, 1);
    }
}
//#endregion

