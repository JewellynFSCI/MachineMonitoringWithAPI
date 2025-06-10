var productionMaps = [];
var coordinates = [];
var ImgName = [];

$(document).ready(function () {
    GetProductionMap();
    GetImgNamefromDb();
});

//#region 'Get List of Production Map'
function GetProductionMap() {
    $("#PlantNoSelect").on("change", function () {
        var SelectedPlantNo = $(this).val();
        var dropdownProdMapName = $("#ProductionMapIdSelect");
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

//#region 'ShowImage and Plot point'
function ShowImage() {
    const imageUrl = 'img/productionmap/' + ImgName;

    //Check map
    if (window.map instanceof ol.Map) {
        window.map.setTarget(null);
        window.map = null;
    }
    $('#map').empty(); // Destroy map


    const img = new Image();    //load new map
    //gets its width and height
    img.onload = function () {
        const imageWidth = img.naturalWidth;
        const imageHeight = img.naturalHeight;
        const imageExtent = [0, 0, imageWidth, imageHeight];

        //Add Image Layer to the Map
        const imageLayer = new ol.layer.Image({
            source: new ol.source.ImageStatic({
                url: imageUrl,
                imageExtent: imageExtent,
                projection: 'PIXELS'
            })
        });

        //Setup Map View
        const view = new ol.View({
            projection: new ol.proj.Projection({
                code: 'PIXELS',
                units: 'pixels',
                extent: imageExtent
            }),
            center: [imageWidth / 2, imageHeight / 2],
            zoom: 1,
            maxZoom: 5
        });

        //Initialize Map
        const map = new ol.Map({
            target: 'map',
            layers: [imageLayer],
            view: view
        });
        view.fit(imageExtent);
        window.map = map;


        //Create Point Layer (Vector Layer)
        const pointSource = new ol.source.Vector();
        const pointLayer = new ol.layer.Vector({
            source: pointSource,
            style: new ol.style.Style({
                image: new ol.style.Circle({
                    radius: 7,
                    fill: new ol.style.Fill({ color: 'red' }),
                    stroke: new ol.style.Stroke({ color: 'white', width: 2 })
                })
            })
        });
        map.addLayer(pointLayer);

        var PlantNo = $('#PlantNoSelect').val();
        var ProductionMapId = $('#ProductionMapIdSelect').val();
        // Retrieve coordinates from the server
        $.ajax({
            url: '/Admin/GetMCLocation', // <-- Adjust this URL
            type: 'GET',
            data: { PlantNo: PlantNo, ProductionMapId: ProductionMapId },
            dataType: 'json',
            success: function (data) {
                if (data.mclist && Array.isArray(data.mclist)) {
                    data.mclist.forEach(function (item) {
                        const coordinate = [item.x, item.y];
                        const pointFeature = new ol.Feature(new ol.geom.Point(coordinate));
                        pointFeature.set('machineLocationId', item.machineLocationId);
                        pointFeature.set('name', item.machineCode); // Optional: store ID or other props here
                        pointSource.addFeature(pointFeature);
                    });
                }
            },
            error: function () {
                alert('Failed to load coordinates from database.');
            }
        });

        //Allow Feature Modification (Move Mode)
        const modifyCollection = new ol.Collection();
        const modifyInteraction = new ol.interaction.Modify({
            features: modifyCollection
        });
        modifyInteraction.setActive(false);
        map.addInteraction(modifyInteraction);


        //Popup DOM Setup
        const popupElement = document.createElement('div');
        popupElement.className = 'ol-popup';
        popupElement.innerHTML = '<a href="#" class="ol-popup-closer" id="popupCloser"><i class="fas fa-times"></i></a>';
        document.body.appendChild(popupElement);


        //Attach Popup Overlay to the Map
        const popupOverlay = new ol.Overlay({
            element: popupElement,
            offset: [0, -15],
            positioning: 'bottom-center',
            stopEvent: true
        });
        map.addOverlay(popupOverlay);

        let activeFeature = null;

        //Handle Map Clicks (Add New or Select Existing)
        map.on('singleclick', function (evt) {
            const feature = map.forEachFeatureAtPixel(evt.pixel, f => f);

            if (!feature) {
                popupOverlay.setPosition(undefined);
                activeFeature = null;
                modifyInteraction.setActive(true);  //allow it to be movable
                modifyCollection.clear();

                const coordinate = evt.coordinate;
                const pointFeature = new ol.Feature(new ol.geom.Point(coordinate));
                pointFeature.set('name', 'Point ' + (pointSource.getFeatures().length + 1));
                pointSource.addFeature(pointFeature);


                activeFeature = pointFeature;
                modifyCollection.push(activeFeature);
                popupElement.innerHTML = buildPopupHTML(coordinate);
                popupOverlay.setPosition(coordinate);
                return;
            }

            activeFeature = feature;
            modifyCollection.clear();
            modifyCollection.push(activeFeature);
            modifyInteraction.setActive(true);  //allow it to be movable

            const coord = feature.getGeometry().getCoordinates();
            const name = feature.get('name') || '';
            const id = feature.get('machineLocationId') || '';
            popupElement.innerHTML = buildPopupHTML(coord, name,id);
            popupOverlay.setPosition(coord);
        });

        //Popup Click Events (MOVE, DELETE)
        popupElement.addEventListener('click', function (e) {
            if (!activeFeature) return;

            const target = e.target;
            const closerEl = popupElement.querySelector('.ol-popup-closer');

            // Check if clicked element is the closer or inside it
            if (closerEl && (target === closerEl || closerEl.contains(target))) {
                popupOverlay.setPosition(undefined);
                activeFeature = null;
                modifyCollection.clear();
                modifyInteraction.setActive(false);
                e.preventDefault();
                return;
            }

            switch (e.target.id) {
                case 'popupCloser':
                case 'popupCloserIcon':
                    popupOverlay.setPosition(undefined);
                    activeFeature = null;
                    modifyCollection.clear();
                    modifyInteraction.setActive(false);
                    e.preventDefault();
                    break;
            }
        });

        //Update Coordinates on Move
        modifyInteraction.on('modifyend', function () {
            if (!activeFeature) return;
            const coord = activeFeature.getGeometry().getCoordinates();
            document.getElementById('X').value = Math.round(coord[0]);
            document.getElementById('Y').value = Math.round(coord[1]);
            popupOverlay.setPosition(coord);
        });
    };

    img.src = imageUrl;
}
//#endregion

//#region Utility: Build Popup HTML Form
function buildPopupHTML(coord, name, id) {
    return `
           <a href="#" class="ol-popup-closer" id="popupCloser"><i class="fas fa-times"></i></a>
                <form method="POST" id="popupForm">
                    <input type="hidden" id="MachineLocationId" name="MachineLocationId" value="${id || ''}"/>
                    <div class="row">
                        <div class="form-group col-sm-6">
                            <label for="X"> <i class="fas fa-arrows-alt-h"></i> X Coordinate</label>
                            <input type="text" class="form-control" id="X" name="X" value="${Math.round(coord[0])}" readonly>
                        </div>
                        <div class="form-group col-sm-6">
                            <label for="Y"> <i class="fas fa-arrows-alt-v"></i> Y Coordinate</label>
                            <input type="text" class="form-control" id="Y" name="Y" value="${Math.round(coord[1])}" readonly>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="MachineCode">Machine Code:</label><br/>
                        <input type="text" class="form-control w-100" id="MachineCode" name="MachineCode" placeholder="Enter Machine Code. . ." value="${name || ''}" />
                    </div>
                    <div class="row mt-10">
                        <div class="form-group">
                             
                            <button type="button" class="btn btn-danger" id="btnDelete" onclick="Delete(${id})"> <i class="fas fa-trash"></i> DELETE</button>
                            <button type="button" class="btn btn-success" id="btnSave" onclick="SaveToDB()"> <i class="fas fa-save"></i> SAVE</button> 
                        </div>
                    </div>
                </form>
            `;
}
//#endregion

//#region 'SaveCoordinatesToDb'
function SaveToDB() {
    var form = $('#popupForm')[0];
    var formData = new FormData(form);

    var PlantNo = $('#PlantNoSelect').val();
    var ProductionMapId = $('#ProductionMapIdSelect').val();


    formData.append('PlantNo', PlantNo);
    formData.append('ProductionMapId', ProductionMapId);

    $.ajax({
        url: '/Admin/SaveMcCoordinates',
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
                ShowImage();
            });
        },
        error: function (xhr) {
            Swal.fire({
                title: 'Error',
                text: xhr.responseText,
                icon: 'error',
                confirmButtonText: 'OK'
            }).then(() => {
                ShowImage();
            });
        }
    });
}
//#endregion

//#region 'Delete'
function Delete(id) {
    Swal.fire({
        title: 'Are you sure you want to delete Machine in this location?',
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
                        ShowImage();
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