var ImgName = [];

$(function () {
    $("#PlantNoSelect").val(null);

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


    //#region 'STAND-BY for every connection made by SignalR/OWS'
    connection.on("ReceivedAlert", function (ticket) {
        console.log("Received Ticket Alert:", ticket);

        if (ticket.success) {
            if (window.map && window.map instanceof ol.Map) {
                const pointLayer = window.map.getLayers().getArray().find(layer => layer instanceof ol.layer.Vector);
                const pointSource = pointLayer?.getSource();

                if (pointSource) {
                    pointSource.clear(); // remove old features

                    // Re-fetch and re-add new features
                    GetMachineStatus(window.map, pointSource);
                } else {
                    console.warn("Point source not found. Unable to replot.");
                }
            }
        }
    });
    //#endregion

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
    const padding = 600;
    const paddedExtent = [
        imageExtent[0] - padding, // minX - padding
        imageExtent[1], // minY - padding
        imageExtent[2] + padding, // maxX + padding
        imageExtent[3] // maxY + padding
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
        zoom: 1,
        maxZoom: 5,
        extent: paddedExtent // <-- LIMIT PANNING TO IMAGE BOUNDS
    });

    const map = new ol.Map({
        target: 'map',
        layers: [imageLayer],
        view: view
    });

    view.fit(paddedExtent);
    return map;
}
//#endregion

//#region 'addPointLayer'
function addPointLayer(map, pointSource) {
    let start = new Date().getTime(); // animation reference
    const ONE_MINUTE = 60 * 1000;
    const baseSize = 6;

    // Set start time only once for each feature with status "DONE"
    pointSource.getFeatures().forEach(feature => {
        if (feature.get('status_id') === 3 || feature.get('status_id') === 8) {
            feature.set('showCircleStartTime', new Date().getTime());
        }
    });

    const pointLayer = new ol.layer.Vector({
        source: pointSource,
        style: function (feature, resolution) {
            const status = feature.get('status_id');
            const status_color = feature.get('hex_value');
            const adjustedRadius = baseSize / resolution;

            if (status === 1) {  //"Machine Downtime"
                const elapsed = new Date().getTime() - start;
                const pulseDuration = 500;
                const progress = (elapsed % pulseDuration) / pulseDuration;
                const radius = adjustedRadius * progress;
                const opacity = 1 - progress;

                return new ol.style.Style({
                    image: new ol.style.Circle({
                        radius: radius * 3,
                        stroke: new ol.style.Stroke({
                            color: hexToRgba(status_color, opacity),
                            width: 2
                        }),
                        fill: new ol.style.Fill({
                            color: hexToRgba(status_color, opacity)
                        })
                    })
                });
            } else if (status === 3 || status === 8) {     //"Done = 3"    "Cancelled = 8"
                const completedDateStr = feature.get('completedDate'); // "2025-07-02T08:27:21"
                const startTime = new Date(completedDateStr).getTime(); // Convert to timestamp
                const now = new Date().getTime();

                if (startTime && (now - startTime <= ONE_MINUTE)) {
                    return new ol.style.Style({
                        image: new ol.style.Circle({
                            radius: adjustedRadius,
                            fill: new ol.style.Fill({
                                color: hexToRgba(status_color, 1)
                            }),
                            stroke: new ol.style.Stroke({
                                color: 'white',
                                width: 1
                            })
                        })
                    });
                }
                return null; // Hide after 1 minute
            } else {
                return new ol.style.Style({
                    image: new ol.style.Circle({
                        radius: adjustedRadius,
                        fill: new ol.style.Fill({
                            color: hexToRgba(status_color)
                        }),
                        stroke: new ol.style.Stroke({
                            color: 'white',
                            width: 1
                        })
                    })
                });
            }
        }
    });

    // 🔄 Re-render for animation (e.g. Machine Downtime)
    const animate = () => {
        pointLayer.changed();
        requestAnimationFrame(animate);
    };
    animate();

    // ⏱️ Re-evaluate 'DONE' status every second to update styles
    setInterval(() => {
        pointSource.getFeatures().forEach(f => f.changed());
    }, 1000);

    map.addLayer(pointLayer);
    return pointLayer;
}
//#endregion

//#region hexToRgba
function hexToRgba(hex, alpha = 1) {
    let r = 0, g = 0, b = 0;

    // Handle shorthand like "#f00"
    if (hex.length === 4) {
        r = parseInt(hex[1] + hex[1], 16);
        g = parseInt(hex[2] + hex[2], 16);
        b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length === 7) {
        r = parseInt(hex[1] + hex[2], 16);
        g = parseInt(hex[3] + hex[4], 16);
        b = parseInt(hex[5] + hex[6], 16);
    }

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
//#endregion

//#region 'GetMachineStatus'
function GetMachineStatus(map, pointSource) {
    const PlantNo = $('#PlantNoSelect').val();
    const ProductionMapId = $('#ProductionMapIdSelect').val();

    // Get the container element
    const container = document.getElementById("machine-cards");
    if (!container) {
        console.warn("machine-cards container not found in DOM.");
        return;
    }

    // Clear previous content
    container.innerHTML = "";

    const featureMap = {};

    $.ajax({
        url: '/Admin/GetMachineStatus',
        type: 'GET',
        data: { PlantNo, ProductionMapId },
        dataType: 'json',
        success: function (data) {
            if (data.mclist && Array.isArray(data.mclist)) {
                // 1. Sort the list by addDate (newest first)
                data.mclist.sort((a, b) => new Date(b.addDate) - new Date(a.addDate));

                data.mclist.forEach(function (item) {
                    const pointFeature = new ol.Feature(new ol.geom.Point([item.x, item.y]));
                    pointFeature.set('machineLocationId', item.machineLocationId);
                    pointFeature.set('machinecode', item.machinecode);
                    pointFeature.set('controlno', item.controlno);
                    pointFeature.set('status_id', item.status_id);
                    pointFeature.set('status', item.status);
                    pointFeature.set('hex_value', item.hex_value);
                    pointFeature.set('type', item.type);
                    pointFeature.set('process', item.process);
                    pointFeature.set('area', item.area);
                    pointFeature.set('mc_error_buyoff_repair_date', item.mc_error_buyoff_repair_date);
                    pointFeature.set('details', item.details);
                    pointFeature.set('requestor', item.requestor);
                    pointFeature.set('me_support', item.me_support);
                    pointFeature.set('errorcode', item.errorcode);
                    pointFeature.set('errorname', item.errorname);
                    pointFeature.set('completedDate', item.completedDate);
                    pointFeature.set('addDate', item.addDate);
                    pointSource.addFeature(pointFeature);

                    featureMap[item.machinecode] = pointFeature;

                    if (item.status !== "Completed" && item.status !== "Cancelled") {
                        const timeAgo = formatTimeAgo(item.mc_error_buyoff_repair_date); // format the time before using

                        // Create the card HTML
                        const cardHtml = `
                            
                                <div class="card rounded machine-card" data-machinecode="${item.machinecode}">
                                    <div class="card-body rounded">
                                        <div class="row">
                                            <div class="col-md-2 rounded" style="background-color: ${item.hex_value};"></div>
                                            <div class="col-md-10 cardcontent">
                                                <p><strong>${item.machinecode}</strong> </p>
                                                <p><i class="time-ago" data-adddate="${item.mc_error_buyoff_repair_date}">${timeAgo}</i></p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            
                        `;

                        // Append the card to the container
                        container.insertAdjacentHTML("beforeend", cardHtml);
                    }
                });

                // 🧠 Add click handler to cards
                container.querySelectorAll('.machine-card').forEach(card => {
                    card.addEventListener('click', function () {
                        const machinecode = this.getAttribute('data-machinecode');
                        const feature = featureMap[machinecode]; // 👈 this is the only way to access it

                        if (feature) {
                            const coord = feature.getGeometry().getCoordinates();
                            const popupOverlay = map.getOverlays().item(0);
                            const popupElement = popupOverlay.getElement();

                            const popupHtml = buildPopupHTML(
                                feature.get('machinecode'),
                                feature.get('controlno'),
                                feature.get('status'),
                                feature.get('type'),
                                feature.get('process'),
                                feature.get('area'),
                                feature.get('mc_error_buyoff_repair_date'),
                                feature.get('details'),
                                feature.get('requestor'),
                                feature.get('me_support'),
                                feature.get('errorcode'),
                                feature.get('errorname')
                            );

                            popupElement.innerHTML = popupHtml;
                            //popupOverlay.setPosition(coord);
                            popupOverlay.setDynamicPosition(coord);
                            popupOverlay.setPosition(coord);
                            map.getView().animate({ center: coord, duration: 0 });

                            // ✅ Add close button behavior
                            const closer = popupElement.querySelector(".ol-popup-closer");
                            if (closer) {
                                closer.onclick = function (evt) {
                                    evt.preventDefault();
                                    popupOverlay.setPosition(undefined);
                                    closer.blur();
                                    return false;
                                };
                            }
                        } else {
                            console.warn(`Feature for machinecode ${machinecode} not found.`);
                        }
                    });
                });


                //update every minute
                setInterval(updateTimestamps, 60000);
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

//#region 'updateTimestamps'
function updateTimestamps() {
    const elements = document.querySelectorAll('.time-ago');
    elements.forEach(el => {
        const timestamp = el.getAttribute('data-adddate');
        if (timestamp) {
            el.textContent = formatTimeAgo(timestamp);
        }
    });
}
//#endregion

//#region 'formatTimeAgo'
function formatTimeAgo(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = Math.floor((now - time) / 1000);

    if (isNaN(diff)) return ''; // if invalid timestamp

    if (diff < 60) return `${diff}secs ago`;
    const mins = Math.floor(diff / 60);
    if (mins < 60) return `${mins}mins ago`;
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    if (hrs < 24) return remMins === 0 ? `${hrs}h ago` : `${hrs}h ${remMins}m ago`;
    const days = Math.floor(hrs / 24);
    return `${days}days ago`;
}
//#endregion

//#region 'setupPopup'
function setupPopup(map) {
    const popupElement = document.createElement('div');
    popupElement.className = 'ol-popup arrow-bottom'; // default arrow pointing down
    document.body.appendChild(popupElement);

    const popupOverlay = new ol.Overlay({
        element: popupElement,
        offset: [0, -10],
        positioning: 'bottom-center',
        stopEvent: true
    });
    map.addOverlay(popupOverlay);

    // ✅ Dynamically adjust popup position and arrow direction
    popupOverlay.setDynamicPosition = function (coordinate) {
        const pixel = map.getPixelFromCoordinate(coordinate);
        const thresholdY = 200;

        if (pixel[1] < thresholdY) {
            // Near top, push popup below point
            popupOverlay.setOffset([0, 255]);
            popupOverlay.setPositioning('top-center');

            popupElement.classList.remove('arrow-bottom');
            popupElement.classList.add('arrow-top');
        } else {
            // Default: popup above point
            popupOverlay.setOffset([0, -5]);
            popupOverlay.setPositioning('bottom-center');

            popupElement.classList.remove('arrow-top');
            popupElement.classList.add('arrow-bottom');
        }
    };

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
            //popupOverlay.setPosition(coord);
            popupOverlay.setDynamicPosition(coord);
            popupOverlay.setPosition(coord);
        }


    });

    map.on('pointermove', function (evt) {
        const hit = map.hasFeatureAtPixel(evt.pixel, {
            layerFilter: layer => layer === map.getLayers().getArray().find(l => l instanceof ol.layer.Vector)
        });

        map.getTargetElement().style.cursor = hit ? 'pointer' : '';
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
function buildPopupHTML(machinecode, controlno, status, type, process, area, mc_error_buyoff_repair_date, details, requestor, me_support = '', errorcode, errorname) {
    const isoDate = mc_error_buyoff_repair_date;
    const dateObj = new Date(isoDate);

    const timeAgo = formatTimeAgo(mc_error_buyoff_repair_date);


    if (requestor === " (sapphire2)") {
        var requestorToOws = "";
    }

    // Example: Convert to local string
    const datetime = dateObj.toLocaleString();
    return `
            <div class="containerpopup">
                <div class="card" style="box-shadow: none;">
                    <div class="card-header">
                        <a href="#" class="ol-popup-closer" id="popupCloser">
                            <i class="fas fa-times"></i>
                        </a>
                    </div>

                    <div class="card-body pop-up-body">
                        <div class="row mb-1">
                            <div class="col">
                                <h5 style="color: blue;">
                                    <i>${timeAgo}</i>
                                </h5>
                                <p><i>${datetime}</i></p>
                                <p><i>${requestorToOws}</i></p>
                            </div>
                            <div class="text-right col">
                                <h5>
                                    ${machinecode}
                                </h5>
                                <p><i>${process}</i></p>
                                <p><i>${area}</i></p>
                            </div>
                        </div>

                        <hr />
                        <div class="mb-1">
                            <p><strong>ControlNo: </strong> ${controlno}</p>
                            <p><strong>Details:</strong> ${details}</p>
                        </div>

                        ${me_support ? `
                            <hr />
                            <div class="mb-1">
                                <p><strong>Maintenance Personnel:</strong></p>
                                <p>${me_support}</p>
                                <p>${errorcode} - ${errorname}</p>
                            </div>
                        ` : ``}
                    </div>
                </div>
            </div>
            `;
}
//#endregion
