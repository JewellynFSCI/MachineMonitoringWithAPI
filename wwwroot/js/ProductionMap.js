// --- Global State ---
let ImgName = [];
let productionMaps = [];
let map = null;
let pointSource = null;
let featureMap = {}; // Maps machinecode -> ol.Feature
let timestampInterval = null;

// --- Constants ---
const ONE_MINUTE = 60 * 1000;

$(function () {
    $("#PlantNoSelect").prop('selectedIndex', 0);

    // Initialize all event-driven functions
    GetProductionMap();
    GetImgNamefromDb();
    Legend();
    LocateMC();

    // Attach card click handler once
    InitCardClickHandler();

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

        if (ticket.success && map) {
            // Check if our pointSource exists
            if (pointSource) {
                pointSource.clear(); // remove old features

                // Re-fetch and re-add new features
                GetMachineStatus(map, pointSource);
            } else {
                console.warn("Point source not found. Unable to replot.");
            }
        }
    });
    //#endregion

});

//#region 'Get List of Production Map'
function GetProductionMap() {
    $("#PlantNoSelect").on("change", function () {
        let SelectedPlantNo = $(this).val();
        let dropdownProdMapName = $("#ProductionMapIdSelect");
        dropdownProdMapName.empty();
        $('.legend-item').removeClass('selected');
        $("#machine-cards").empty();

        // Reset the map container safely
        resetMap();

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
        let SelectedProdMapId = $(this).val();

        if (!productionMaps || productionMaps.length === 0) {
            $('#map').text('No image retrieved.');
            return;
        }

        let GetImgName = productionMaps.find(x => x.productionMapId == SelectedProdMapId);
        if (GetImgName && GetImgName.imgName) {
            ImgName = GetImgName.imgName;
            ShowImage();
            $('.legend-item').removeClass('selected');
        } else {
            $('#map').html('<p>No image retrieved.</p>');
        }
    });
}
//#endregion

//#region 'ShowImage'
function ShowImage() {
    const imageUrl = '/img/productionmap/' + ImgName;

    resetMap(); // Use the new helper function

    const img = new Image();
    img.onload = function () {
        const imageWidth = img.naturalWidth;
        const imageHeight = img.naturalHeight;
        const imageExtent = [0, 0, imageWidth, imageHeight];

        // Assign to global map and pointSource
        map = initializeMap(imageUrl, imageExtent, imageWidth, imageHeight);
        pointSource = new ol.source.Vector();

        GetMachineStatus(map, pointSource);
        const pointLayer = addPointLayer(map, pointSource);
        const modifyCollection = new ol.Collection();
        const modifyInteraction = new ol.interaction.Modify({ features: modifyCollection });
        modifyInteraction.setActive(false);
        const popupOverlay = setupPopup(map);

        // Pass map-specific variables to the click handler
        handleMapClick(map, pointSource, popupOverlay, modifyCollection);

        let zoomInfo = document.getElementById('zoom-info');
        if (!zoomInfo) {
            zoomInfo = document.createElement('div');
            zoomInfo.id = 'zoom-info';
            zoomInfo.innerText = 'Zoom: 100%'; // Default text
            document.getElementById('map').appendChild(zoomInfo);
        }

        const view = map.getView();
        const minZoom = view.getMinZoom();
        const maxZoom = view.getMaxZoom();

        function updateZoomPercentage() {
            const currentZoom = view.getZoom();
            const percentage = ((currentZoom - minZoom) / (maxZoom - minZoom)) * 100;
            document.getElementById('zoom-info').innerText = `Zoom: ${percentage.toFixed(0)}%`;
        }

        view.on('change:resolution', updateZoomPercentage);
        updateZoomPercentage(); // Set initial value

    };
    img.src = imageUrl;
}
//#endregion

//#region 'InitializedMap'
function initializeMap(imageUrl, imageExtent, imageWidth, imageHeight) {
    const padding = 600;
    const paddedExtent = [
        imageExtent[0] - padding, // minX - padding
        imageExtent[1], // minY 
        imageExtent[2] + padding, // maxX + padding
        imageExtent[3] // maxY 
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
    const baseSize = 10;

    // Set start time only once for each feature with status "DONE"
    pointSource.getFeatures().forEach(feature => {
        if (feature.get('status_id') === 3 || feature.get('status_id') === 8) {
            feature.set('showCircleStartTime', new Date().getTime());
        }
    });

    const pointLayer = new ol.layer.Vector({
        source: pointSource,
        style: function (feature, resolution) {
            if (feature.get('visible') === false) return null; // hide feature
            const status = feature.get('status_id');
            const status_color = feature.get('hex_value');
            const adjustedRadius = baseSize / resolution;
            const pulse = 8 / resolution;

            if (status === 1) {  //"Machine Downtime"
                const elapsed = new Date().getTime() - start;
                const pulseDuration = 500;
                const progress = (elapsed % pulseDuration) / pulseDuration;
                const radius = pulse * progress;
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
            } else if (status === 3 || status === 8) {    //"Done = 3"    "Cancelled = 8"
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

    const container = document.getElementById("machine-cards");
    if (!container) {
        console.warn("machine-cards container not found in DOM.");
        return;
    }

    // Clear previous content
    container.innerHTML = "";

    // Reset the global feature map
    featureMap = {};

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
                    // Set all properties at once
                    pointFeature.setProperties({
                        'machineLocationId': item.machineLocationId,
                        'machinecode': item.machinecode,
                        'controlno': item.controlno,
                        'status_id': item.status_id,
                        'status': item.status,
                        'hex_value': item.hex_value,
                        'type': item.type,
                        'process': item.process,
                        'area': item.area,
                        'mc_error_buyoff_repair_date': item.mc_error_buyoff_repair_date,
                        'details': item.details,
                        'requestor': item.requestor,
                        'me_support': item.me_support,
                        'errorcode': item.errorcode,
                        'errorname': item.errorname,
                        'completedDate': item.completedDate,
                        'addDate': item.addDate,
                        'visible': true // Default to visible
                    });

                    pointSource.addFeature(pointFeature);

                    // Add to our global lookup map
                    featureMap[item.machinecode] = pointFeature;

                    if (item.status !== "Completed" && item.status !== "Cancelled") {
                        const timeAgo = formatTimeAgo(item.mc_error_buyoff_repair_date); // format the time before using

                        // Create the card HTML
                        const cardHtml = `
                                <div class="card rounded machine-card mb-2" data-machinecode="${item.machinecode}" data-status="${item.status}">
                                    <div class="card-body rounded">
                                        <div class="row">
                                            <div class="col-md-2 rounded" style="background-color: ${item.hex_value}; max-height: 31px;"></div>
                                            <div class="col-md-10 cardcontent">
                                                <p class="pmachinecard"><strong>${item.machinecode}</strong> </p>
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

                SearchBarMachine();

                // 🧠 **FIX:** Clear old interval and set a new one
                // This prevents multiple intervals from running
                if (timestampInterval) {
                    clearInterval(timestampInterval);
                }
                timestampInterval = setInterval(updateTimestamps, 60000);
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

//#region 'Machine Card Click Handler'
function InitCardClickHandler() {
    // Use event delegation. This listener is attached ONCE.
    // It listens for clicks on elements with class '.machine-card'
    // that are added to '#machine-cards' now or in the future.
    $("#machine-cards").on("click", ".machine-card", function () {
        const machinecode = $(this).data('machinecode');
        const feature = featureMap[machinecode]; // Use global featureMap

        if (feature) {
            $("#MCLocator").val(machinecode); // Update dropdown

            // Use the new helper function
            showPopupForFeature(feature);
        } else {
            console.warn(`Feature for machinecode ${machinecode} not found.`);
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
    if (mins < 60) return `${mins}min/s ago`;
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    if (hrs < 24) return remMins === 0 ? `${hrs}h ago` : `${hrs}h ${remMins}m ago`;
    const days = Math.floor(hrs / 24);
    return `${days}day/s ago`;
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

//#region 'handleMapClick'
function handleMapClick(map, pointSource, popupOverlay, modifyCollection) {

    map.on('singleclick', function (evt) {
        const clickedFeature = map.forEachFeatureAtPixel(evt.pixel, f => f);

        //close popup if click outside the popup
        if (!clickedFeature) {
            popupOverlay.setPosition(undefined);
            modifyCollection.clear();
            return;
        }

        // Clicked on a feature
        if (clickedFeature) {
            modifyCollection.clear();
            modifyCollection.push(clickedFeature);

            // Use the new helper function
            showPopupForFeature(clickedFeature);
        }
    });

    map.on('pointermove', function (evt) {
        const hit = map.hasFeatureAtPixel(evt.pixel, {
            layerFilter: layer => layer === map.getLayers().getArray().find(l => l instanceof ol.layer.Vector)
        });

        map.getTargetElement().style.cursor = hit ? 'pointer' : '';
    });
}
//#endregion

//#region 'Show Popup Helper'
// --- NEW HELPER ---
// Centralized function to show a popup for any given feature
function showPopupForFeature(feature) {
    if (!map || !feature) return;

    const coord = feature.getGeometry().getCoordinates();
    const popupOverlay = map.getOverlays().item(0); // Assumes overlay 0 is popup
    const popupElement = popupOverlay.getElement();

    // Get all properties from the feature
    const props = feature.getProperties();

    const popupHtml = buildPopupHTML(
        props.machinecode, props.controlno, props.status, props.type,
        props.process, props.area, props.mc_error_buyoff_repair_date,
        props.details, props.requestor, props.me_support,
        props.errorcode, props.errorname
    );

    popupElement.innerHTML = popupHtml;
    popupOverlay.setDynamicPosition(coord); // Call the dynamic positioner
    popupOverlay.setPosition(coord);
    map.getView().animate({ center: coord, duration: 0 });

    // Add close button behavior (needs to be done every time HTML is set)
    const closer = popupElement.querySelector(".ol-popup-closer");
    if (closer) {
        closer.onclick = function (evt) {
            evt.preventDefault();
            popupOverlay.setPosition(undefined);
            closer.blur();
            return false;
        };
    }
}
//#endregion

//#region 'Map Reset Helper'
// --- NEW HELPER ---
// Centralized function to completely reset the map
function resetMap() {
    if (map instanceof ol.Map) {
        map.setTarget(null); // Detach map from DOM
        map = null;
    }
    $('#map').empty(); // Clear map div contents

    // Clear global state
    pointSource = null;
    featureMap = {};

    // Clear the timestamp interval
    if (timestampInterval) {
        clearInterval(timestampInterval);
        timestampInterval = null;
    }
}
//#endregion

//#region Utility: Build Popup HTML Form
function buildPopupHTML(machinecode, controlno, status, type, process, area, mc_error_buyoff_repair_date, details, requestor, me_support = '', errorcode, errorname = '') {
    const isoDate = mc_error_buyoff_repair_date;
    const dateObj = new Date(isoDate);

    const timeAgo = formatTimeAgo(mc_error_buyoff_repair_date);

    let requestorToOws;

    if (requestor === " (sapphire2)") {
        requestorToOws = "";
    } else {
        requestorToOws = requestor;
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
                                <p>${errorname ? `${errorname}` : ``}</p>
                            </div>
                        ` : ``}
                    </div>
                </div>
            </div>
            `;
}
//#endregion

//#region Legend
function Legend() {
    $('.legend-item').on('click', function () {
        const selectedStatus = $(this).data('status');

        // Highlight selected legend
        $('.legend-item').removeClass('selected');
        $(this).addClass('selected');

        // Close any open popup
        if (map && map.getOverlays().getLength() > 0) {
            const popupOverlay = map.getOverlays().item(0);
            if (popupOverlay) popupOverlay.setPosition(undefined);
        }

        // Filter machine cards
        $('.machine-card').each(function () {
            const cardStatus = $(this).data('status');
            $(this).toggle(!selectedStatus || cardStatus === selectedStatus);
        });

        // Filter map points
        if (pointSource) {
            pointSource.getFeatures().forEach(f => {
                if (!selectedStatus) {
                    f.set('visible', true); // show all
                } else {
                    f.set('visible', f.get('status') === selectedStatus);
                }
                f.changed(); // trigger style update
            });
        }

        // Update MCLocator dropdown
        const dropdown = $("#MCLocator");
        dropdown.empty();
        dropdown.append("<option value='' disabled selected><--Locate Machine Code--></option>");

        // **NOTE:** This is jQuery, so ':visible' is a valid selector here.
        $('.machine-card:visible').each(function () {
            const mcCode = $(this).data('machinecode');
            dropdown.append($('<option></option>').val(mcCode).text(mcCode));
        });
    });
}
//#endregion

//#region 'Search bar Menu'
function SearchBarMachine() {
    const dropdownMCLocator = $("#MCLocator");
    dropdownMCLocator.empty();

    // Get all machine codes that have cards
    const cardMachineCodes = Array.from(document.querySelectorAll('.machine-card'))
        .map(card => card.getAttribute('data-machinecode'));

    if (cardMachineCodes.length === 0) {
        dropdownMCLocator.append("<option value='' disabled selected><--No machines on map--></option>");
        return;
    }

    // Sort ascending
    cardMachineCodes.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    dropdownMCLocator.append("<option value='' disabled selected><--Locate Machine Code--></option>");

    cardMachineCodes.forEach(mc => {
        dropdownMCLocator.append($('<option></option>').val(mc).text(mc));
    });

}
//#endregion

//#region 'Locate'
function LocateMC() {
    $("#MCLocator").on("change", function () {
        const selectedMachineCode = $(this).val();

        if (!selectedMachineCode) {
            console.warn("No machine code selected.");
            return;
        }

        // Find the corresponding card element
        const card = document.querySelector(`.machine-card[data-machinecode="${selectedMachineCode}"]`);
        if (card) {
            card.click(); // ✅ Trigger the card click (handled by InitCardClickHandler)
            // Optional: scroll to the card if the container has overflow
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            Swal.fire({
                title: 'Not Found',
                text: 'Machine card not found on the page.',
                icon: 'warning',
                confirmButtonText: 'OK'
            });
        }
    });
}
//#endregion