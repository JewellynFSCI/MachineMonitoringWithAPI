var ImgName = [];

$(function () {
    GetProductionMap();
    GetImgNamefromDb();

    //#region 'Connection for SignalR'
    const connection = new signalR.HubConnectionBuilder()
        .withUrl("/Notification")
        .configureLogging(signalR.LogLevel.Information)
        .withAutomaticReconnect([0, 0, 10000])  //10 seconds
        .build();

    async function start() {
        try {
            await connection.start();
            console.log("SignalR Connected.");
        } catch (err) {
            console.log(err);
            setTimeout(start, 5000);
        }
    };

    connection.onclose(async () => {
        await start();
    });

    // Start the connection.
    start();

    //#endregion


    //STAND-BY for every connection made by SignalR
    connection.on("ReceivedAlert", function (ticket) {
        console.log("Received Ticket Alert:", ticket);
        ReceivedSignal(ticket);
    });

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
        GetMachineStatus(map, pointSource);
        const pointLayer = addPointLayer(map, pointSource);
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
        view: view,
        controls: ol.control.defaults.defaults().extend([
            new ol.control.FullScreen()
        ])
    });

    view.fit(imageExtent);
    return map;
}
//#endregion

//#region 'addPointLayer'
function addPointLayer(map, pointSource) {
    let start = new Date().getTime(); // animation reference

    const pointLayer = new ol.layer.Vector({
        source: pointSource,
        style: function (feature, resolution) {
            const status = feature.get('status'); // Get the status of each machine
            const baseSize = 15;
            const adjustedRadius = baseSize / resolution;

            if (status === "Machine Downtime") {
                const elapsed = new Date().getTime() - start;
                const pulseDuration = 500;
                const progress = (elapsed % pulseDuration) / pulseDuration;
                const radius = adjustedRadius * progress;
                const opacity = 1 - progress;

                return new ol.style.Style({
                    image: new ol.style.Circle({
                        radius: radius * 2,
                        stroke: new ol.style.Stroke({
                            color: `rgba(255, 0, 0, ${opacity})`,   // red
                            width: 2
                        }),
                        fill: new ol.style.Fill({
                            color: `rgba(255, 0, 0, ${opacity})`    // red
                        })
                    })
                });
            }

            if (status === "GOOD") {
                return new ol.style.Style({
                    image: new ol.style.Circle({
                        radius: adjustedRadius,
                        fill: new ol.style.Fill({
                            color: 'green'
                        }),
                        stroke: new ol.style.Stroke({
                            color: 'white',
                            width: 1
                        })
                    }),
                    text: new ol.style.Text({
                        text: 'DF',
                        font: `bold ${adjustedRadius-3}px sans-serif`,
                        fill: new ol.style.Fill({
                            color: 'white'
                        }),
                        stroke: new ol.style.Stroke({
                            color: 'black',
                            width: 1
                        }),
                        textAlign: 'center',
                        textBaseline: 'middle',
                        offsetY: 0
                    })
                });
                //return new ol.style.Style({
                //    image: new ol.style.Circle({
                //        radius: adjustedRadius,
                //        fill: new ol.style.Fill({
                //            color: 'green'
                //        }),
                //        stroke: new ol.style.Stroke({
                //            color: 'white',
                //            width: 1
                //        })
                //    })
                //});
            }

            // Default style for undefined or other statuses
            //return new ol.style.Style({
            //    image: new ol.style.Circle({
            //        radius: adjustedRadius,
            //        fill: new ol.style.Fill({
            //            color: 'gray'
            //        }),
            //        stroke: new ol.style.Stroke({
            //            color: '#999',
            //            width: 1
            //        })
            //    })
            //});
        }
    });

    // Re-render every frame for animation
    const animate = () => {
        pointLayer.changed();
        requestAnimationFrame(animate);
    };
    animate();

    map.addLayer(pointLayer);
    return pointLayer;
}
//#endregion

//#region 'GetMachineStatus'
function GetMachineStatus(map, pointSource) {
    const PlantNo = $('#PlantNoSelect').val();
    const ProductionMapId = $('#ProductionMapIdSelect').val();

    $.ajax({
        url: '/Admin/GetMachineStatus',
        type: 'GET',
        data: { PlantNo, ProductionMapId },
        dataType: 'json',
        success: function (data) {
            if (data.mclist && Array.isArray(data.mclist)) {
                data.mclist.forEach(function (item) {
                    const pointFeature = new ol.Feature(new ol.geom.Point([item.x, item.y]));
                    pointFeature.set('machineLocationId', item.machineLocationId);
                    pointFeature.set('machinecode', item.machinecode);
                    pointFeature.set('controlno', item.controlno);
                    pointFeature.set('status', item.status);
                    pointFeature.set('type', item.type);
                    pointFeature.set('process', item.process);
                    pointFeature.set('area', item.area);
                    pointFeature.set('mc_error_buyoff_repair_date', item.mc_error_buyoff_repair_date);
                    pointFeature.set('details', item.details);
                    pointFeature.set('requestor', item.requestor);
                    pointFeature.set('me_support', item.me_support);
                    pointFeature.set('errorcode', item.errorcode);
                    pointFeature.set('errorname', item.errorname);
                    pointSource.addFeature(pointFeature);
                });
            }
        },
        error: function () {
            Swal.fire({
                title: 'Error',
                text: 'Please refresh page!',
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

        //close popup if click outside the popup
        if (!clickedFeature) {
            popupOverlay.setPosition(undefined);
            activeFeature = null;
            modifyCollection.clear();
        }

        if (clickedFeature) {
            activeFeature = clickedFeature;

            modifyCollection.clear();
            modifyCollection.push(activeFeature);

            const coord = activeFeature.getGeometry().getCoordinates();
            const machinecode = activeFeature.get('machinecode');
            const controlno = activeFeature.get('controlno');
            const status = activeFeature.get('status');
            const type = activeFeature.get('type');
            const process = activeFeature.get('process');
            const area = activeFeature.get('area');
            const mc_error_buyoff_repair_date = activeFeature.get('mc_error_buyoff_repair_date');
            const details = activeFeature.get('details');
            const requestor = activeFeature.get('requestor');
            const me_support = activeFeature.get('me_support');
            const errorcode = activeFeature.get('errorcode');
            const errorname = activeFeature.get('errorname');

            popupElement.innerHTML = buildPopupHTML(machinecode, controlno, status, type, process, area, mc_error_buyoff_repair_date, details, requestor, me_support, errorcode, errorname);
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
function buildPopupHTML(machinecode, controlno, status, type, process, area, mc_error_buyoff_repair_date, details, requestor, me_support='', errorcode, errorname) {
    return `
    <div class="containerpopup">
    <a href = "#" class="ol-popup-closer" id = "popupCloser" > <i class="fas fa-times"></i></a >
        <form>
            <div class="form-group">
                <label> Machine Status: </label>
                <input type="text" class="form-control" value="${status}" readonly>
            </div>
            <div class="form-group">
                <label> Control No: </label>
                <input type="text" class="form-control" value="${controlno}" readonly>
            </div>
            <div class="form-group">
                <label> Machine Code: </label>
                <input type="text" class="form-control" value="${machinecode}" readonly>
            </div>
            <div class="form-group">
                <label> Process: </label>
                <input type="text" class="form-control" value="${process}" readonly>
            </div>
            <div class="form-group">
                <label> Area: </label>
                <input type="text" class="form-control" value="${area}" readonly>
            </div>
            <div class="form-group">
                <label> Date: </label>
                <input type="text" class="form-control" value="${mc_error_buyoff_repair_date}" readonly>
            </div>
            <div class="form-group">
                <label> Details: </label>
                <textarea class="form-control" readonly>${details}</textarea>
            </div>
            <div class="form-group">
                <label> Requestor: </label>
                <input type="textarea" class="form-control" value="${requestor}" readonly>
            </div>
            ${ me_support ? 
            `<div class="form-group">
                <label> Maintenance Support: </label>
                <input type="textarea" class="form-control" value="${me_support}" readonly>
            </div>
            <div class="form-group">
                <label> Maintenance Support: </label>
                <input type="textarea" class="form-control" value="${errorcode}" readonly>
            </div>
            <div class="form-group">
                <label> Maintenance Support: </label>
                <input type="textarea" class="form-control" value="${errorname}" readonly>
            </div>
            `:
            ``
            }
        </form>
    </div>

`;
}
//#endregion

//#region 'RecievedSignal'
function ReceivedSignal(ticket) {
    $.ajax({
        url: '/Admin/ReceivedSignal',   //Insert or Update Ticket Details
        type: 'POST',
        data: ticket,
        dataType: 'json',
        success: function (data) {
            Swal.fire({
                title: 'Success',
                text: 'call ShowImage to update prod map',
                icon: 'success',
                confirmButtonText: 'OK'
            }).then(() => {
                ShowImage();
            });
        }
    });

}
//#endregion





