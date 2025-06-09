var productionMaps = [];
var coordinates = [];

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
            //$('#map').attr('data-image', `/img/productionmap/${GetImgName.imgName}`);
            var ImgName = GetImgName.imgName;
            ShowImage(ImgName);
        } else {
            $('#map').html('<p>No image retrieved.</p>');
        }
    });
}
//#endregion


//#region 'ShowImage and Plot point'
function ShowImage(ImgName) {
    const imageUrl = 'img/productionmap/' + ImgName;

    // Reset the map container safely
    if (window.map instanceof ol.Map) {
        window.map.setTarget(null);
        window.map = null;
    }
    $('#map').empty(); // Clear map div contents

    $('#map').empty();

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

        const map = new ol.Map({
            target: 'map',
            layers: [imageLayer],
            view: view
        });

        view.fit(imageExtent);
        window.map = map;

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

        const modifyCollection = new ol.Collection();
        const modifyInteraction = new ol.interaction.Modify({
            features: modifyCollection
        });
        modifyInteraction.setActive(false);
        map.addInteraction(modifyInteraction);

        const snap = new ol.interaction.Snap({ source: pointSource });
        map.addInteraction(snap);

        const popupElement = document.createElement('div');
        popupElement.className = 'ol-popup';
        popupElement.innerHTML = '<a href="#" class="ol-popup-closer" id="popupCloser"><i class="fas fa-times"></i></a>';
        document.body.appendChild(popupElement);

        const popupOverlay = new ol.Overlay({
            element: popupElement,
            offset: [0, -15],
            positioning: 'bottom-center',
            stopEvent: true
        });
        map.addOverlay(popupOverlay);

        let activeFeature = null;

        map.on('singleclick', function (evt) {
            const feature = map.forEachFeatureAtPixel(evt.pixel, f => f);
            if (!feature) {
                popupOverlay.setPosition(undefined);
                activeFeature = null;
                modifyInteraction.setActive(false);
                modifyCollection.clear();

                const coordinate = evt.coordinate;
                const pointFeature = new ol.Feature(new ol.geom.Point(coordinate));
                pointFeature.set('name', 'Point ' + (pointSource.getFeatures().length + 1));
                pointSource.addFeature(pointFeature);
                return;
            }
   
            activeFeature = feature;
            modifyCollection.clear();
            modifyCollection.push(activeFeature);
            modifyInteraction.setActive(false);

            const coord = feature.getGeometry().getCoordinates();
            const name = feature.get('name') || '';

            popupElement.innerHTML =
                '<a href="#" class="ol-popup-closer" id="popupCloser"><i class="fas fa-times"></i></a>' +
                '<form id="popupForm">' +


                '<div class="row">' +
                '<div class="form-group col-sm-6">' +
                '<label for="coordX"> <i class="fas fa-arrows-alt-h"></i> X Coordinate</label>' +
                `<input type="text" class="form-control" id="coordX" name="coordX" value="${Math.round(coord[0])}" readonly>` +
                '</div>' +
                '<div class="form-group col-sm-6">' +
                '<label for="coordY"> <i class="fas fa-arrows-alt-v"></i> Y Coordinate</label>' +
                `<input type="text" class="form-control" id="coordY" name="coordY" value="${Math.round(coord[1])}" readonly>` +
                '</div>' +
                '</div>' +

                '<div class="form-group">' +
                '<label for="MachineCode">Machine Code:</label><br/>' +
                `<input type="text" class="form-control w-100" id="MachineCode" value="${name}" readonly />` +
                '</div>' +

                '<div class="row mt-10">' +
                '<div class="form-group">' +
                '<button type="button" class="btn btn-primary" id="btnMove"> <i class="fas fa-arrows-alt"></i> MOVE</button> ' +
                '<button type="button" class="btn btn-warning" id="btnEdit"> <i class="fas fa-edit"></i> EDIT</button> ' +
                '<button type="button" class="btn btn-success" id="btnSave"> <i class="fas fa-save"></i> SAVE</button> ' +
                '<button type="button" class="btn btn-danger" id="btnDelete"> <i class="fas fa-trash"></i> DELETE</button>' +
                '</div>' +
                '</div>' +
                '</form>';

    addMarkerWithPopup(map, tempCoordinate, name, message, markers);

            popupOverlay.setPosition(coord);
});
//#endregion

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
                case 'btnMove':
                    modifyInteraction.setActive(true);
                    break;
                case 'btnEdit':
                    document.getElementById('MachineCode').removeAttribute('readonly');
                    break;
                case 'btnSave':
                    const newName = document.getElementById('MachineCode').value.trim();
                    if (newName) activeFeature.set('name', newName);
                    document.getElementById('MachineCode').setAttribute('readonly', true);
                    modifyInteraction.setActive(false);
                    alert('Saved: ' + newName);
                    break;
                case 'btnDelete':
                    if (confirm('Are you sure?')) {
                        pointSource.removeFeature(activeFeature);
                        popupOverlay.setPosition(undefined);
                        activeFeature = null;
                        modifyCollection.clear();
                        modifyInteraction.setActive(false);
                    }
                    break;
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

        modifyInteraction.on('modifyend', function () {
            if (!activeFeature) return;
            const coord = activeFeature.getGeometry().getCoordinates();
            document.getElementById('coordX').value = Math.round(coord[0]);
            document.getElementById('coordY').value = Math.round(coord[1]);
            popupOverlay.setPosition(coord);
    });
    };

    img.src = imageUrl;
}
//#endregion






//#region 'SaveCoordinatesToDb'
function Save() {
    var form = $('#AddMachineCoordsModal').find('form')[0]; // Get the form element
    var formData = new FormData(form);

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

