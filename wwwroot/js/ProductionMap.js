var ImgName = [];

$(function () {
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

//#region 'ShowImage'
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

        const map = initializeMap(imageUrl, imageExtent, imageWidth, imageHeight);
        const pointSource = new ol.source.Vector();
        const pointLayer = addPointLayer(map, pointSource);
        fetchAndPlotCoordinates(map, pointSource);
        const modifyCollection = new ol.Collection();
        const modifyInteraction = new ol.interaction.Modify({ features: modifyCollection });
        modifyInteraction.setActive(false);
        const popupOverlay = setupPopup(map);
        handleMapClick(map, pointSource, popupOverlay, modifyCollection);
        
        window.map = map;
    };
    img.src = imageUrl;
}
//#endregion

//#region 'InitializedMap'
function initializeMap(imageUrl, imageExtent, imageWidth, imageHeight) {
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
    return map;
}
//#endregion

////#region 'addPointLayer'
//function addPointLayer(map, pointSource) {
//    const pointLayer = new ol.layer.Vector({
//        source: pointSource,
//        style: function (feature, resolution) {
//            // Desired size in map units (e.g., 10 pixels at base resolution)
//            const baseSize = 8;
//            const adjustedRadius = baseSize / resolution;

//            return new ol.style.Style({
//                image: new ol.style.Circle({
//                    radius: adjustedRadius,
//                    fill: new ol.style.Fill({ color: 'red' }),
//                    stroke: new ol.style.Stroke({ color: 'white', width: 2 })
//                })
//            });
//        }
//    });
//    map.addLayer(pointLayer);
//    return pointLayer;
//}
////#endregion

//#region 'addPointLayer'
function addPointLayer(map, pointSource) {
    let start = new Date().getTime(); // animation reference

    //const pointLayer = new ol.layer.Vector({
    //    source: pointSource,
    //    style: function (feature, resolution) {
    //        const elapsed = new Date().getTime() - start;
    //        const pulseDuration = 500; // 3 seconds
    //        const progress = (elapsed % pulseDuration) / pulseDuration;

    //        const baseSize =30;
    //        const adjustedRadius = baseSize / resolution;

    //        const radius = adjustedRadius * progress;
    //        const opacity = 1 - progress;

    //        return [
    //            // Pulse Circle
    //            new ol.style.Style({
    //                image: new ol.style.Circle({
    //                    radius: radius,
    //                    stroke: new ol.style.Stroke({
    //                        color: 'rgba(255, 0, 0, ' + opacity + ')',
    //                        width: 2
    //                    }),
    //                    fill: new ol.style.Fill({
    //                        color: 'rgba(255, 0, 0, ' + (opacity * 1) + ')'
    //                    })
    //                })
    //            }),
    //            // Static Icon
    //            new ol.style.Style({
    //                image: new ol.style.Icon({
    //                    radius: radius,
    //                    anchor: [0.5, 0.5],
    //                    src: '/img/alarmGIF.gif',
    //                    scale: 0.05
    //                })
    //            }),
    //        ];
    //    }
    //});

    const pointLayer = new ol.layer.Vector({
        source: pointSource,
        style: function (feature, resolution) {
            const elapsed = new Date().getTime() - start;
            const pulseDuration = 500;
            const progress = (elapsed % pulseDuration) / pulseDuration;

            const baseSize = 30;
            const adjustedRadius = baseSize / resolution;

            const radius = adjustedRadius * progress;
            const opacity = 1 - progress;

            const iconScale = adjustedRadius / 600; // adjust the denominator for size tuning

            return [
                // Pulse Circle
                new ol.style.Style({
                    image: new ol.style.Circle({
                        radius: radius,
                        stroke: new ol.style.Stroke({
                            color: 'rgba(255, 0, 0, ' + opacity + ')',
                            width: 2
                        }),
                        fill: new ol.style.Fill({
                            color: 'rgba(255, 0, 0, ' + opacity + ')'
                        })
                    })
                }),
                // Resizable GIF Icon
                new ol.style.Style({
                    image: new ol.style.Icon({
                        anchor: [0.5, 0.5],
                        anchorXUnits: 'fraction',
                        anchorYUnits: 'fraction',
                        src: '/img/alarmGIF.gif',
                        scale: iconScale
                    })
                }),
            ];
        }
    });


    // Trigger re-rendering every frame (~60fps)
    const animate = function () {
        pointLayer.changed();
        requestAnimationFrame(animate);
    };
    animate();

    map.addLayer(pointLayer);
    return pointLayer;
}
//#endregion

//#region 'fetchAndPlotCoordinates' // FOR MODIFY
function fetchAndPlotCoordinates(map, pointSource) {
    const PlantNo = $('#PlantNoSelect').val();
    const ProductionMapId = $('#ProductionMapIdSelect').val();

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
                    pointSource.addFeature(pointFeature);
                });
            }
        },
        error: function () {
            Swal.fire({
                title: 'Error',
                text: 'Failed to load machine locations.',
                icon: 'error',
                confirmButtonText: 'OK'
            });
        }
    });
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
    return popupOverlay;
}
//#endregion

//#region 'hanldeMapClick'
function handleMapClick(map, pointSource, popupOverlay, modifyCollection) {
    let activeFeature = null;
    const popupElement = popupOverlay.getElement();

    map.on('singleclick', function (evt) {
        const clickedFeature = map.forEachFeatureAtPixel(evt.pixel, f => f);

        if (clickedFeature) {
            activeFeature = clickedFeature;

            modifyCollection.clear();
            modifyCollection.push(activeFeature);

            const coord = activeFeature.getGeometry().getCoordinates();
            const name = activeFeature.get('name');
            const id = activeFeature.get('machineLocationId');
            popupElement.innerHTML = buildPopupHTML(name, id);
            popupOverlay.setPosition(coord);
        }
    });

    popupElement.addEventListener('click', function (e) {
        if (!activeFeature) return;

        const target = e.target;
        const closer = popupElement.querySelector('.ol-popup-closer');

        if (closer && (target === closer || closer.contains(target))) {
            popupOverlay.setPosition(undefined);
            activeFeature = null;
            modifyCollection.clear();
            e.preventDefault();
            return;
        }
    });
}

//#endregion

//#region Utility: Build Popup HTML Form
function buildPopupHTML( name, id) { // Added default values for name and id
    return `
    <a href = "#" class="ol-popup-closer" id = "popupCloser" > <i class="fas fa-times"></i></a >
        <form method="POST" id="popupForm">
            <input type="hidden" id="MachineLocationId" name="MachineLocationId" value="${id}" />

            <p> <strong> Machine Code : </strong> ${name}</p>
            <p> <strong> Error Code : </strong> Error Code (Error Name)</p>

        </form>
`;
}
//#endregion
