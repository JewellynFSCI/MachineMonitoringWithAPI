var productionMaps = [];
var coordinates = [];
var ImgName = [];
var activeFeature = null;

$(function () {
    GetProductionMap();
    GetImgNamefromDb();
    SearchBarMachine();
    LocateMC();

    const existingPopup = document.querySelector('.ol-popup');
    if (existingPopup) {
        existingPopup.remove();
    }
});

//#region 'Get List of Production Map'
function GetProductionMap() {
    $("#PlantNoSelect").on("change", function () {
        var SelectedPlantNo = $(this).val();
        var dropdownProdMapName = $("#ProductionMapIdSelect");
        dropdownProdMapName.empty();
        var dropdownMCLocator = $("#MCLocator");
        dropdownMCLocator.empty();

        loadMachineOptions(SelectedPlantNo);

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

//#region 'Get Image Name from cache'
function GetImgNamefromDb() {
    $("#ProductionMapIdSelect").on("change", function () {
        var SelectedProdMapId = $(this).val();

        if (!productionMaps || productionMaps.length === 0) {
            $('#map').text('No image retrieved.');
            return;
        }

        var GetImgName = productionMaps.find(x => x.productionMapId == SelectedProdMapId);
        if (GetImgName && GetImgName.imgName) {
            ImgName = GetImgName.imgName;
            ShowImage();
        } else {
            $('#map').html('<p>No image retrieved.</p>');
        }
    });
}
//#endregion

//#region Utility: Build Popup HTML Form
function buildPopupHTML(coord, name = '', id = '') { // Added default values for name and id
    return `
    <a href = "#" class="ol-popup-closer" id = "popupCloser" > <i class="fas fa-times"></i></a >
        <form method="POST" id="popupForm">
            <input type="hidden" id="MachineLocationId" name="MachineLocationId" value="${id || ''}" />
            <div class="row">
                <div class="form-group col-sm-6" hidden>
                    <label for="X"> <i class="fas fa-arrows-alt-h"></i> X Coordinate</label>
                    <input type="text" class="form-control" id="X" name="X" value="${Math.round(coord[0])}" readonly>
                </div>
                <div class="form-group col-sm-6" hidden>
                    <label for="Y"> <i class="fas fa-arrows-alt-v"></i> Y Coordinate</label>
                    <input type="text" class="form-control" id="Y" name="Y" value="${Math.round(coord[1])}" readonly>
                </div>
            </div>
            
			<div class="form-group">
                <label class="mr-2"> <i class="fas fa-memory mr-1"></i> Machine</label>
                <select name="machineCode" id="machineCode" class="form-control select2 w-100">
                    ${machineOptionsHTML}
                </select>
            </div>

            <div class="row mt-10">
                <div class="form-group">
                    ${id ? // If ID exists, it's an existing point, show delete and update (save)
            `<button type="button" class="btn btn-danger" id="btnDelete"> <i class="fas fa-trash"></i> DELETE</button>
                        <button type="button" class="btn btn-success" id="btnSave"> <i class="fas fa-save"></i> UPDATE</button>`
            : // If no ID, it's a new point, show only save
            `<button type="button" class="btn btn-success" id="btnSave"> <i class="fas fa-save"></i> SAVE</button>`
        }
                </div>
            </div>
        </form>
`;
}
//#endregion

//#region 'SaveCoordinatesToDb'
function SaveToDB(moved) {
    var form = $('#popupForm')[0];
    var formData = new FormData(form);

    var PlantNo = $('#PlantNoSelect').val();
    var ProductionMapId = $('#ProductionMapIdSelect').val();

    formData.append('PlantNo', PlantNo);
    formData.append('ProductionMapId', ProductionMapId);

    var MCLocId = formData.get("MachineLocationId");

    if (moved == "moved" && (MCLocId === null || MCLocId === "")) {
        return;
    }

    $.ajax({
        url: '/Admin/SaveMcCoordinates',
        type: 'POST',
        data: formData,
        contentType: false,
        processData: false,
        success: function (response) {
            if (response.success) {
                if (moved == null) {
                    Swal.fire({
                        title: 'Success',
                        text: response.message,
                        icon: 'success',
                        confirmButtonText: 'OK'
                    }).then(() => {
                        window.popupOverlay?.setPosition(undefined);
                        activeFeature = null;
                        UpdateMachinePoints();
                    });
                }
            } else {
                if (response.message === "No data updated!") {
                    return null;
                } else {
                    Swal.fire({
                        title: 'Error',
                        text: response.message,
                        icon: 'error',
                        confirmButtonText: 'OK'
                    });
                }
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

//#region 'Delete'
function Delete(id) {
    var mcName = $('#machineCode').val();
    Swal.fire({
        title: 'Are you sure you want to delete Machine '+ mcName +' in this location?',
        text: "You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, do it!'
    }).then((result) => {
        if (result.isConfirmed) {
            $.ajax({
                url: '/Admin/DeleteMCLocation',
                type: 'POST',
                data: { machineLocationId: id },
                success: function (response) {
                    Swal.fire({
                        title: 'Done!',
                        text: response,
                        icon: 'success',
                        confirmButtonText: 'OK'
                    }).then(() => {
                        window.popupOverlay?.setPosition(undefined);
                        UpdateMachinePoints();
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

//#region 'ShowImage()'
function ShowImage() {
    const imageUrl = '/img/productionmap/' + ImgName;

    if (window.map instanceof ol.Map) {
        window.map.setTarget(null);
        window.map = null;
    }

    $('#map').empty();

    const img = new Image();
    img.onload = function () {
        const imageWidth = img.naturalWidth;
        const imageHeight = img.naturalHeight;
        const imageExtent = [0, 0, imageWidth, imageHeight];

        ShowImageBase(imageUrl, imageExtent, imageWidth, imageHeight);
        UpdateMachinePoints(); // ⬅️ load points after image is ready
    };
    img.src = imageUrl;
}
//#endregion

//#region 'ShowImageBase'
function ShowImageBase(imageUrl, imageExtent, imageWidth, imageHeight) {
    const padding = 700;
    const paddedExtent = [
        imageExtent[0] - padding, // minX - padding
        imageExtent[1] - padding, // minY - padding
        imageExtent[2] + padding, // maxX + padding
        imageExtent[3] + padding  // maxY + padding
    ];

    const imageLayer = new ol.layer.Image({
        source: new ol.source.ImageStatic({
            url: imageUrl,
            imageExtent: imageExtent,
            projection: 'PIXELS'
        })
    });

    const view = new ol.View({
        projection: new ol.proj.Projection({
            code: 'PIXELS',
            units: 'pixels',
            extent: paddedExtent
        }),
        center: [imageWidth / 2, imageHeight / 2],
        zoom: 2,
        maxZoom: 5,
        extent: paddedExtent
    });

    const map = new ol.Map({
        target: 'map',
        layers: [imageLayer],
        view: view,
        controls: ol.control.defaults.defaults().extend([
            new ol.control.FullScreen()
        ])
    });

    const pointSource = new ol.source.Vector();
    window.pointSource = pointSource;

    const pointLayer = addPointLayer(map, pointSource);
    window.pointLayer = pointLayer;

    const modifyCollection = new ol.Collection();
    const modifyInteraction = new ol.interaction.Modify({ features: modifyCollection });
    modifyInteraction.setActive(false);
    map.addInteraction(modifyInteraction);

    window.modifyCollection = modifyCollection;
    window.modifyInteraction = modifyInteraction;

    const popupOverlay = setupPopup(map);
    handleMapClick(map, pointSource, popupOverlay, modifyCollection, modifyInteraction);
    setupModifyListener(modifyInteraction, popupOverlay);

    window.map = map;
}
//#endregion

//#region 'UpdateMachinePoints'
function UpdateMachinePoints() {
    const PlantNo = $('#PlantNoSelect').val();
    const ProductionMapId = $('#ProductionMapIdSelect').val();

    if (!window.pointSource) return;
    window.pointSource.clear();

    // 🧹 Close popup
    if (window.popupOverlay) {
        window.popupOverlay.setPosition(undefined);
    }

    // 🧹 Clear modify interaction
    if (window.modifyCollection) {
        window.modifyCollection.clear();
    }
    if (window.modifyInteraction) {
        window.modifyInteraction.setActive(false);
    }

    // 🧹 Remove active and temp points
    if (window.activeFeature && window.pointSource.hasFeature(window.activeFeature)) {
        window.pointSource.removeFeature(window.activeFeature);
    }
    if (window.tempPointFeature && window.pointSource.hasFeature(window.tempPointFeature)) {
        window.pointSource.removeFeature(window.tempPointFeature);
    }

    // 🧹 Clear references
    window.activeFeature = null;
    window.tempPointFeature = null;

    // 🔁 Reload features from DB
    $.ajax({
        url: '/Admin/GetMCLocation',
        type: 'GET',
        data: { PlantNo, ProductionMapId },
        dataType: 'json',
        success: function (data) {
            if (data.mclist && Array.isArray(data.mclist)) {
                data.mclist.forEach(function (item) {
                    const pointFeature = new ol.Feature(new ol.geom.Point([item.x, item.y]));
                    pointFeature.set('machineLocationId', item.machineLocationId);
                    pointFeature.set('name', item.machineCode);
                    window.pointSource.addFeature(pointFeature);
                });
            }
        },
        error: function () {
            Swal.fire({
                title: 'Error',
                text: 'Failed to update machine locations.',
                icon: 'error',
                confirmButtonText: 'OK'
            });
        }
    });
}
//#endregion

//#region 'addPointLayer'
function addPointLayer(map, pointSource) {
    const pointLayer = new ol.layer.Vector({
        source: pointSource,
        style: function (feature, resolution) {
            // Desired size in map units (e.g., 10 pixels at base resolution)
            const baseSize = 5;
            const adjustedRadius = baseSize / resolution;

            return new ol.style.Style({
                image: new ol.style.Circle({
                    radius: adjustedRadius,
                    fill: new ol.style.Fill({ color: 'red' }),
                    stroke: new ol.style.Stroke({ color: 'white', width: 2 })
                })
            });
        }
    });
    map.addLayer(pointLayer);
    return pointLayer;
}
//#endregion

//#region 'setupPopup'
function setupPopup(map) {
    const popupElement = document.createElement('div');
    popupElement.className = 'ol-popup';
    document.body.appendChild(popupElement);

    const popupOverlay = new ol.Overlay({
        element: popupElement,
        offset: [0, -15],
        positioning: 'bottom-center',
        stopEvent: true
    });
    map.addOverlay(popupOverlay);

    // ✅ Make it globally accessible
    window.popupOverlay = popupOverlay;

    return popupOverlay;
}
//#endregion

//#region 'handleMapClick'
function handleMapClick(map, pointSource, popupOverlay, modifyCollection, modifyInteraction) {
    activeFeature = null;
    let tempPointFeature = null;
    let activeCoordinates = null;
    const popupElement = popupOverlay.getElement();

    map.on('singleclick', function (evt) {
        const clickedFeature = map.forEachFeatureAtPixel(evt.pixel, f => f);

        if (clickedFeature) {
            const coordinates = clickedFeature.getGeometry().getCoordinates();

            const activeCoordinates = activeFeature
                ? activeFeature.getGeometry().getCoordinates()
                : null;

            if (
                activeCoordinates &&
                coordinates[0] === activeCoordinates[0] &&
                coordinates[1] === activeCoordinates[1]
            ) {
                return; // Same point clicked again — do nothing
            }
        }

        // ✅ If clicked the same active feature again, do nothing (really do nothing)
        if (clickedFeature && clickedFeature === activeFeature) {
            return;
        }

        // ✅ Remove temp point if clicked somewhere else
        if (tempPointFeature && clickedFeature !== tempPointFeature) {
            pointSource.removeFeature(tempPointFeature);
            tempPointFeature = null;
        }


        if (clickedFeature) {
            // ⬇️ Clicked a different point — update popup
            activeFeature = clickedFeature;
            tempPointFeature = null;
            window.activeFeature = activeFeature;
            window.tempPointFeature = tempPointFeature;
            modifyCollection.clear();
            modifyCollection.push(activeFeature);
            modifyInteraction.setActive(true);

            const coord = activeFeature.getGeometry().getCoordinates();
            const name = activeFeature.get('name') || '';
            const id = activeFeature.get('machineLocationId') || '';
            popupElement.innerHTML = buildPopupHTML(coord, name, id);
            popupOverlay.setPosition(coord);

            $('#machineCode').select2();
            $('#machineCode').val(name).trigger('change');

            document.getElementById('X').value = Math.round(coord[0]);
            document.getElementById('Y').value = Math.round(coord[1]);
            document.getElementById('machineCode').value = name;
        } else {
            // ⬇️ Clicked on empty space — add new temporary point
            const coordinate = evt.coordinate;
            const newPointFeature = new ol.Feature(new ol.geom.Point(coordinate));
            tempPointFeature = newPointFeature;
            pointSource.addFeature(tempPointFeature);

            activeFeature = tempPointFeature;
            modifyCollection.clear();
            modifyCollection.push(activeFeature);
            modifyInteraction.setActive(true);

            popupElement.innerHTML = buildPopupHTML(coordinate); // no name/id = new point
            popupOverlay.setPosition(coordinate);

            $('#machineCode').select2();
            document.getElementById('X').value = Math.round(coordinate[0]);
            document.getElementById('Y').value = Math.round(coordinate[1]);
        }
    });

    popupElement.addEventListener('click', function (e) {
        const target = e.target;
        const closer = popupElement.querySelector('.ol-popup-closer');

        if (closer && (target === closer || closer.contains(target))) {
            if (activeFeature === tempPointFeature) {
                pointSource.removeFeature(tempPointFeature);
                tempPointFeature = null;
            }

            popupOverlay.setPosition(undefined);
            activeFeature = null;
            modifyCollection.clear();
            modifyInteraction.setActive(false);
            e.preventDefault();
            return;
        }

        if (target.id === 'btnSave') SaveToDB();

        if (target.id === 'btnDelete') {
            const id = document.getElementById('MachineLocationId').value;
            if (id) Delete(id);
            else {
                if (activeFeature === tempPointFeature) {
                    pointSource.removeFeature(tempPointFeature);
                    tempPointFeature = null;
                    popupOverlay.setPosition(undefined);
                    activeFeature = null;
                    modifyCollection.clear();
                    modifyInteraction.setActive(false);
                }
            }
        }
    });
}

//#endregion

//#region 'setupModifyListener'
function setupModifyListener(modifyInteraction, popupOverlay) {
    modifyInteraction.on('modifyend', function (e) {
        const feature = e.features.item(0);
        if (!feature) return;

        const coord = feature.getGeometry().getCoordinates();
        document.getElementById('X').value = Math.round(coord[0]);
        document.getElementById('Y').value = Math.round(coord[1]);
        popupOverlay.setPosition(coord);
        SaveToDB("moved");
    });
}
//#endregion

//#region 'loadMachineOptions by PlantNo'
function loadMachineOptions(plantNo) {
    $.ajax({
        url: '/Admin/GetMachineCodesByPlant',
        type: 'GET',
        data: { plantNo: plantNo },
        success: function (response) {
            if (response.success && response.machines.length > 0) {
                const options = response.machines.map(mc =>
                    `<option value="${mc.machineCode}">${mc.machineCode}</option>`
                );

                window.machineOptionsHTML = `
                    <option disabled selected>--Select Machine--</option>
                    ${options.join("")}
                `;
            } else {
                window.machineOptionsHTML = `<option disabled selected>--No machines available--</option>`;
            }
        },
        error: function () {
            window.machineOptionsHTML = `<option disabled selected>--Failed to load machines--</option>`;
        }
    });
}
//#endregion

//#region 'Get MachineLocation'
function SearchBarMachine() {
    $("#ProductionMapIdSelect").on("change", function () {
        var SelectedProdMapId = $(this).val();
        var dropdownMCLocator = $("#MCLocator");
        dropdownMCLocator.empty();

        const PlantNo = $('#PlantNoSelect').val();

        $.ajax({
            url: '/Admin/GetMCLocation',
            type: 'GET',
            data: { PlantNo, ProductionMapId :SelectedProdMapId },
            contentType: 'application/json',
            success: function (response) {
                if (response.mclist.length > 0) {
                    // Add default disabled option
                    dropdownMCLocator.append("<option value='' disabled selected><--Locate Machine Code--></option>");

                    // Loop through the response
                    $.each(response.mclist, function (index, item) {
                        dropdownMCLocator.append(
                            $('<option></option>').val(item.machineCode).text(item.machineCode)
                        );
                    });
                } else {
                    dropdownMCLocator.append("<option value='' disabled selected><--No machines available--></option>");
                }
            },
            error: function (xhr, status, error) {
                Swal.fire({
                    title: 'Error',
                    text: xhr.responseText || "Failed to load dropdown.",
                    icon: 'error',
                    confirmButtonText: 'OK'
                });
            }
        });
    });
}
//#endregion

//#region 'Locate'
function LocateMC() {
    $("#MCLocator").on("change", function () {
        const selectedMachineCode = $(this).val();
        if (!selectedMachineCode || !window.pointSource || !window.popupOverlay) return;

        const features = window.pointSource.getFeatures();
        const targetFeature = features.find(f => f.get('name') === selectedMachineCode);

        if (targetFeature) {
            const coord = targetFeature.getGeometry().getCoordinates();
            const name = targetFeature.get('name');
            const id = targetFeature.get('machineLocationId');

            // Update popup content
            const popupElement = window.popupOverlay.getElement();
            popupElement.innerHTML = buildPopupHTML(coord, name, id);
            window.popupOverlay.setPosition(coord);

            // Activate feature for modification
            window.modifyCollection.clear();
            window.modifyCollection.push(targetFeature);
            window.modifyInteraction.setActive(true);

            // Update global state
            window.activeFeature = targetFeature;

            // Focus map to location (pan)
            window.map.getView().animate({
                center: coord,
                duration: 500
            });

            // Initialize select2 and set value
            $('#machineCode').select2();
            $('#machineCode').val(name).trigger('change');

            // Set coordinate inputs
            document.getElementById('X').value = Math.round(coord[0]);
            document.getElementById('Y').value = Math.round(coord[1]);
        } else {
            Swal.fire({
                title: 'Not Found',
                text: 'Machine location not found on the map.',
                icon: 'warning',
                confirmButtonText: 'OK'
            });
        }
    });
}
//#endregion