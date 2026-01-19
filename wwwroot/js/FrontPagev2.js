// --- Global State ---
let map = null;
let pointSource = null;
let productionMaps = [];
let ImgName = [];
let OpenTickets = [];
let selectedStatusFilter = "";
let searchFilter = "";
let popupInitialized = false;
let popupOverlay = null;
let popupContent = null;
let popupContainer = null;
let pulseInterval = null;

const invisibleStyle = new ol.style.Style({
    image: new ol.style.Circle({
        radius: 0
    })
});

//#region 'Main Function'
$(function () {
    initSignalR();
    $("#PlantNoSelect").prop('selectedIndex', 0);
    $("#MCFilterInput").val('');
    $(".clear-btn").hide();
    GetProductionMap();
    GetImgNamefromDb();

    $("#MCFilterInput").on("keyup", function () {
        searchFilter = $(this).val().trim().toUpperCase();
        $(".clear-btn").show();
        popupOverlay.setPosition(undefined);
        applyCardFilters();
    });

    // Click on status rows
    $(".legend-item[data-status]").on("click", function () {
        const clickedStatus = $(this).data("status");
        popupOverlay.setPosition(undefined);

        // Toggle
        if (selectedStatusFilter === clickedStatus) {
            selectedStatusFilter = "";
        } else {
            selectedStatusFilter = clickedStatus;
        }

        // Visual highlight
        $(".legend-item").removeClass("selected-status");
        if (selectedStatusFilter) {
            $(this).addClass("selected-status");
        }

        applyCardFilters();
    });


    $("#showAll").on("click", function () {
        selectedStatusFilter = "";
        $(".legend-item").removeClass("selected-status");
        $("#showAll").addClass("selected-status");
        applyCardFilters();
    });

    // Clear when X in Search Bar is clicked
    $(".clear-btn").on("click", function () {
        $("#MCFilterInput").val("");
        $(".clear-btn").hide();
        popupOverlay.setPosition(undefined);
        searchFilter = "";
        applyCardFilters();
    });

    $(document).on('click', '.machine-card', function () {
        if (!map || !pointSource) return;

        const machineCode = $(this).data('machinecode');

        const feature = pointSource.getFeatures().find(
            f => f.get('machinecode') === machineCode
        );

        if (!feature) return;

        const extent = map.getView().calculateExtent(map.getSize());
        const coord = feature.getGeometry().getCoordinates();

        if (!ol.extent.containsCoordinate(extent, coord)) {
            return;
        }

        showMachinePopup(feature);
    });

    $("#image-preview-overlay").hide();
    $("#image-preview").attr("src", "");

    $(document).on("click", ".popup-image", function (e) {
        e.preventDefault();
        e.stopPropagation();

        const src = $(this).attr("src");

        $("#image-preview").attr("src", src);
        $("#image-preview-overlay").fadeIn(150);
    });

    $("#image-preview-overlay").on("click", function () {
        $(this).fadeOut(150);
    });

    $(document).on("keydown", function (e) {
        if (e.key === "Escape") {
            $("#image-preview-overlay").fadeOut(150);
        }
    });

});
//#endregion

//#region 'initSignalR'
function initSignalR() {
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

    start();

    connection.on("ReceivedAlert", function (ticket) {
        console.log("Received Ticket Alert:", ticket);
        if (ticket.success && map && pointSource) {
            GetOpenTicket();
        }
    });
}
//#endregion

//#region 'Get List of Production Map'
function GetProductionMap() {
    $("#PlantNoSelect").on("change", function () {
        let SelectedPlantNo = $(this).val();
        let dropdownProdMapName = $("#ProductionMapIdSelect");

        dropdownProdMapName.empty();
        resetMap();

        $.ajax({
            url: '/Admin/GetProductionMaps',
            type: 'GET',
            data: { PlantNo: SelectedPlantNo },
            contentType: 'application/json',
            success: function (response) {
                productionMaps = response.locationList || [];
                dropdownProdMapName.append("<option value='' disabled selected><--Select Production Map Name--></option>");
                $.each(response.locationList, function (index, item) {
                    dropdownProdMapName.append($('<option></option>').val(item.productionMapId).text(item.productionMapName));
                });
            },
            error: function (xhr) {
                console.error("Failed to load maps:", xhr.responseText);
            }
        });
    });
}
//#endregion

//#region 'Prod Map Selection Change'
function GetImgNamefromDb() {
    $("#ProductionMapIdSelect").on("change", function () {
        let SelectedProdMapId = $(this).val();
        let GetImgName = productionMaps.find(x => x.productionMapId == SelectedProdMapId);

        if (GetImgName && GetImgName.imgName) {
            ImgName = GetImgName.imgName;
            ShowImage();
        } else {
            resetMap();
            $('#map').html('<p>No image retrieved.</p>');
        }
    });
}
//#endregion

//#region 'ShowImage'
function ShowImage() {
    console.log("Showing Image:");
    const imageUrl = `/mdm-prod-maps/${encodeURIComponent(ImgName)}`;

    resetMap();
    popupInitialized = false;
    const img = new Image();

    img.onload = function () {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        const extent = [0, 0, w, h];

        // 1. Initialize Map
        console.log("Loading: Initalizing Map");
        map = initializeMap(imageUrl, extent, w, h);

        // 2. Initialize Point Source (Required for SignalR to work)
        console.log("Loading: Initalizing Point Source");
        pointSource = new ol.source.Vector();

        // 3. Add Vector Layer to Map
        console.log("Loading: Adding vector layer to map");
        const vectorLayer = new ol.layer.Vector({
            source: pointSource,
            zIndex: 999
        });
        map.addLayer(vectorLayer);

        startPulseLoop();

        // 4. Zoom Percentage Display Logic
        console.log("Loading: Displaying Zoom In and Out");
        const view = map.getView();
        const minZoom = view.getMinZoom();
        const maxZoom = view.getMaxZoom();

        let zoomInfo = document.getElementById('zoom-info');
        if (!zoomInfo) {
            zoomInfo = document.createElement('div');
            zoomInfo.id = 'zoom-info';
            document.getElementById('map').appendChild(zoomInfo);
        }

        // 5. updateZoomPercentage
        function updateZoomPercentage() {
            console.log("Loading: Updating zoom percentage");
            const currentZoom = view.getZoom();
            let percentage = ((currentZoom - minZoom) / (maxZoom - minZoom)) * 100;
            percentage = Math.max(0, Math.min(100, percentage));
            document.getElementById('zoom-info').innerText = `Zoom: ${percentage.toFixed(0)}%`;
        }
        view.on('change:resolution', updateZoomPercentage);
        updateZoomPercentage();

        // 5. Get Open Tickets
        GetOpenTicket();

        // 6. Popup Overlay
        popupContainer = document.getElementById('popup');
        popupContent = document.getElementById('popup-content');
        const popupCloser = document.getElementById('popup-closer');

        popupOverlay = new ol.Overlay({
            element: popupContainer,
            autoPan: false
            ,offset: [0, -10] // 15px above the circle
        });

        map.addOverlay(popupOverlay);

        popupCloser.onclick = function () {
            popupOverlay.setPosition(undefined);
            $('#popup').hide(); // FIX: Explicitly hide
            popupCloser.blur();
            return false;
        };

        // 7. On click to map legends/circle
        if (!popupInitialized) {
            map.on('singleclick', function (evt) {
                const feature = map.forEachFeatureAtPixel(evt.pixel, f => f);

                if (!feature) {
                    popupOverlay.setPosition(undefined);
                    return;
                }
                showMachinePopup(feature);
            });
            popupInitialized = true;
        }

        // 8. Change cursor design for every hover to circles
        map.on('pointermove', function (e) {
            if (!map) return;

            const hit = map.hasFeatureAtPixel(e.pixel);
            map.getTargetElement().style.cursor = hit ? 'pointer' : '';
        });

    };
    img.src = imageUrl;
}
//#endregion

//#region 'InitializedMap'
function initializeMap(imageUrl, imageExtent, imageWidth, imageHeight) {
    const padding = 300;
    const paddedExtent = [
        imageExtent[0] - padding,
        imageExtent[1] - padding,
        imageExtent[2] + padding,
        imageExtent[3] + padding
    ];

    const imageLayer = new ol.layer.Image({
        source: new ol.source.ImageStatic({
            url: imageUrl,
            imageExtent: imageExtent,
            projection: 'PIXELS'
        })
    });

    const view = new ol.View({
        projection: new ol.proj.Projection({ code: 'PIXELS', units: 'pixels', extent: paddedExtent }),
        center: [imageWidth / 2, imageHeight / 2],
        zoom: 1,
        maxZoom: 5,
        extent: paddedExtent
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

//#region 'resetMap'
function resetMap() {
    if (map instanceof ol.Map) {
        map.setTarget(null);
        map = null;
    }
    $('#map').empty();
    pointSource = null;

    // 🔁 Remove old popup if exists
    $('#popup').remove();

    // 🔁 Re-inject popup HTML
    $('body').append(`
        <div id="popup" class="ol-popup" style="display:none;">
            <a href="#" id="popup-closer" class="ol-popup-closer"></a>

            <div class="popup-header" id="popup-header"></div>

            <div id="popup-content" class="popup-body"></div>
        </div>
    `);

    popupInitialized = false;

    $(".legend-item").removeClass("selected-status");
    OpenTickets = [];
    selectedStatusFilter = "";
    searchFilter = "";

    const container = document.getElementById("machine-cards");
    container.innerHTML = "";

    // Reset all counts to 0
    $(".legend-item").each(function () {
        $(this).find("td:last-child").text(0);
    });

    if (pulseInterval) {
        clearInterval(pulseInterval);
        pulseInterval = null;
    }
}
//#endregion

//#region 'Get OpenTikets'
function GetOpenTicket() {
    const SelectedPlantNo = $('#PlantNoSelect').val();
    const SelectedProductionMapId = $('#ProductionMapIdSelect').val();
    console.log("Loading: Getting open tickets");

    $.ajax({
        url: '/Admin/GetOpenTicket',
        type: 'GET',
        data: { PlantNo: SelectedPlantNo, ProductionMapId: SelectedProductionMapId },
        contentType: 'application/json',
        success: function (response) {
            console.log("Loading: Successfully getting open tickets");
            //Set globally the open tickets
            OpenTickets = response.opentickets || [];

            //update summary count
            updateSummaryCounts();

            const container = document.getElementById("machine-cards");
            container.innerHTML = "";

            // sort ASC
            OpenTickets.sort((a, b) => new Date(b.mc_error_buyoff_repair_date) - new Date(a.mc_error_buyoff_repair_date));

            console.log("Loading: Creating cards for each ticket");
            //create cards for each ticket
            OpenTickets.forEach(function (ticket) {
                const timeAgo = formatTimeAgo(ticket.mc_error_buyoff_repair_date); // format the time before using

                const cardHtml = `<div class="card rounded machine-card" data-machinecode="${ticket.machinecode}" data-status="${ticket.ticket_status}">
                                    <div class="card-body">
                                        <div class="row no-gutters h-100-row">
                                            <div class="col-2 p-0" style="background-color: ${ticket.hex_value}; min-height: 100%;"></div>
                                            <div class="col-10 cardcontent">
                                                <p class="pmachinecard"><strong>${ticket.machinecode}</strong></p>
                                                <p class="time-ago-text"><i class="time-ago" data-adddate="${ticket.mc_error_buyoff_repair_date}">${timeAgo}</i></p>
                                            </div>
                                        </div>
                                    </div>
                                  </div>`;
                // Append the card to the container
                container.insertAdjacentHTML("beforeend", cardHtml);
            });

            console.log("Loading: Setting up filter");
            selectedStatusFilter = "";
            $("#showAll").addClass("selected-status");
            applyCardFilters();


            if (map && pointSource) {
                GetMachineStatus(map, pointSource);
            }
        },
        error: function (xhr) {
            console.error("Failed to load maps:", xhr.responseText);
        }
    });

}
//#endregion

//#region 'GetMachineStatus'
function GetMachineStatus(map, pointSource) {
    console.log("Loading: Getting Machine Status");
    if (!map || !pointSource) return;

    pointSource.clear();
    if (!OpenTickets || OpenTickets.length === 0) return;

    // 1.GROUP TICKETS BY MACHINE CODE
    const grouped = {};
    OpenTickets.forEach(t => {
        if (!grouped[t.machinecode]) grouped[t.machinecode] = [];
        grouped[t.machinecode].push(t);
    });

    // 2. LOOP THROUGH MACHINES
    Object.keys(grouped).forEach(mc => {
        const tickets = grouped[mc];

        // Sort by date DESC → latest first
        // tickets.sort((a, b) => new Date(b.mc_error_buyoff_repair_date) - new Date(a.mc_error_buyoff_repair_date));
        tickets.sort((a, b) => a.status_id - b.status_id);

        const latest = tickets[0]; // this determines the circle color

        const x = parseFloat(latest.x);
        const y = parseFloat(latest.y);

        if (isNaN(x) || isNaN(y)) return; // safety check

        // 3.CREATE THE POINT FEATURE ----
        const feature = new ol.Feature({
            geometry: new ol.geom.Point([x, y]),
            machinecode: mc,
            tickets: tickets,
            latestStatus: latest.ticket_status   // 🔑 store latest status
        });

        const baseStyle = new ol.style.Style({
            image: new ol.style.Circle({
                radius: 10,
                fill: new ol.style.Fill({ color: latest.hex_value }),
                stroke: new ol.style.Stroke({
                    color: '#fff',
                    width: 2
                })
            })
        });

        feature.set('baseStyle', baseStyle);

        if (latest.ticket_status === "Machine Downtime") {
            const pulseStyle = createLegendLikePulse(latest.hex_value);

            feature.set('pulseStyle', pulseStyle); // 🔑 STORE IT
            feature.setStyle(pulseStyle);
            feature.set('isPulsing', true);
        } else {
            feature.setStyle(baseStyle);
            feature.set('isPulsing', false);
        }

        pointSource.addFeature(feature);

        console.log(
            mc,
            latest.ticket_status,
            feature.getGeometry().getCoordinates()
        );
    });
    console.log("Completed!");
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

//#region 'updateSummaryCounts'
function updateSummaryCounts() {

    // Reset all counts to 0
    $(".legend-item").each(function () {
        $(this).find("td:last-child").text(0);
    });

    // Count per status
    let counts = {};

    OpenTickets.forEach(t => {
        if (!counts[t.ticket_status]) counts[t.ticket_status] = 0;
        counts[t.ticket_status]++;
    });

    // Update table
    for (let status in counts) {
        let row = $(`.legend-item[data-status='${status}']`);
        row.find("td:last-child").text(counts[status]);
    }

    // Update "Show All"
    $(`.legend-item:last td:last`).text(OpenTickets.length);
}
//#endregion

//#region 'applyCardFilters'
function applyCardFilters() {
    $(".machine-card").each(function () {
        const mc = $(this).data("machinecode").toString().toUpperCase();
        const st = $(this).data("status").toString();

        const matchesSearch = filterBySearch(mc);
        const matchesStatus = filterByStatus(st);

        if (matchesSearch && matchesStatus) {
            $(this).show();
        } else {
            $(this).hide();
        }
    });
    applyCircleFilters();
}

function filterBySearch(machineCode) {
    if (!searchFilter) return true;
    return machineCode.includes(searchFilter);
}

function filterByStatus(status) {
    if (!selectedStatusFilter) return true;
    return status === selectedStatusFilter;
}

function applyCircleFilters() {
    popupOverlay.setPosition(undefined);
    if (!pointSource) return;

    pointSource.getFeatures().forEach(feature => {
        const machineCode = feature.get('machinecode').toUpperCase();
        const status = feature.get('latestStatus');

        const matchesSearch = filterBySearch(machineCode);
        const matchesStatus = filterByStatus(status);

        if (matchesSearch && matchesStatus) {

            if (feature.get('isPulsing')) {
                // 🔥 RESTORE pulse
                feature.setStyle(feature.get('pulseStyle'));
            } else {
                feature.setStyle(feature.get('baseStyle'));
            }

        } else {
            feature.setStyle(invisibleStyle);
        }
    });
}
//#endregion

//#region 'showMachinePopup'
function showMachinePopup(feature) {
    const tickets = feature.get('tickets');
    if (!tickets || tickets.length === 0) return;

    // Only set position if geometry exists
    const coords = feature.getGeometry().getCoordinates();
    if (!coords) return;

    // Show Ticket No per PopUp
    //document.getElementById('popup-header').innerHTML = `
    //  <div class="row pl-2 pr-2">
    //    <h5 style="font-size:30px;">${feature.get('machinecode')}</h5>
    //    ${tickets.length > 1
    //            ? `<div class="text-right col">
    //           <p>Ticket Count:</p>
    //           <i class="pr-5">${tickets.length}</i>
    //         </div>`
    //            : ''
    //        }
    //  </div>
    //`;

    document.getElementById('popup-header').innerHTML = `
    <div class="text-center">
        <h5 style="font-size:25px; margin-bottom:-1%; margin-top: -1%;">${feature.get('machinecode')}</h5>
    </div>
    `;

    let html = '';
    tickets.forEach((t, i) => {

        let requestorToOws = (t.requestor === " (sapphire2)") ? "" : t.requestor;

        const dbDate = new Date(t.mc_error_buyoff_repair_date);
        const readableDate = dbDate.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        

        html += `
            <div class="popup-ticket">
                <div class="row">
                    <div class="col">
                        <h6>
                            <i class="fas fa-flag" style="color:${t.hex_value}"> </i>
                            <i>${t.ticket_status}</i>
                        </h6>
                        <h5>
                            ${t.controlno}
                        </h5>
                        <p>${readableDate}</p>
                        
                    </div>
                    <div class="text-right col">
                        <h5 style="color: blue;">
                            <i>${formatTimeAgo(t.mc_error_buyoff_repair_date)}</i>
                        </h5>
                        <p>${t.process}</p>
                        <p>${t.area}</p>
                        
                    </div>
                </div>
                <hr style="height:1px;color:gray;background-color:gray;width:75%; margin-top: 2%; margin-bottom: 2%;">
                <div>
                    <p><i class="fas fa-info-circle mr-1" style="margin-top:-1%"></i><strong>Details:</strong></p>
                    <p><i>${requestorToOws}</i></p>
                    <p>${t.details}</p>
                    ${t.imgName
                           ? `<p>
                             <img src="/api/Notification/image/${t.id}/${encodeURIComponent(t.imgName)}"
                                  class="popup-image"
                                  loading="lazy" />
                           </p>`: ``
                    }
                </div>

                ${t.me_support ? `
                    <hr style="height:1px;color:gray;background-color:gray;width:75%; margin-top: 2%; margin-bottom: 2%;">
                    <div class="mb-1">
                        <p><i class="fas fa-tools mr-1" style="margin-top:-1%"></i><strong>Maintenance:</strong></p>
                        <p><i>${t.me_support}</i></p>
                        <p>${t.errorname ? `${t.errorname}` : ``}</p>
                    </div>
                ` : ``}
            </div>

            ${tickets.length > 1 ? `<hr style="height:2px;border-width:0;color:gray;background-color:gray">` : ``}
        `;
    });


    
    popupContent.innerHTML = html;
    $('#popup').show();
    popupOverlay.setPosition(coords);
}
//#endregion

//#region 'createLegendLikePulse'
function createLegendLikePulse(status_color) {
    const start = Date.now();
    const pulseDuration = 500;

    const centerStyle = new ol.style.Style({
        image: new ol.style.Circle({
            radius: 8,
            fill: new ol.style.Fill({ color: status_color }),
            stroke: new ol.style.Stroke({
                color: '#ffffff',
                width: 2
            })
        })
    });

    return function () {
        const elapsed = Date.now() - start;
        const progress = (elapsed % pulseDuration) / pulseDuration;

        const radius = 20 * progress;
        const opacity = 0.6 * (1 - progress);

        const haloStyle = new ol.style.Style({
            image: new ol.style.Circle({
                radius: radius + 10,
                fill: new ol.style.Fill({
                    color: hexToRgba(status_color, opacity)
                }),
                stroke: new ol.style.Stroke({
                    color: hexToRgba(status_color, opacity),
                    width: 2
                })
            })
        });

        return [haloStyle, centerStyle];
    };
}
//#endregion

//#region 'startPulseLoop'
function startPulseLoop() {
    if (pulseInterval) return;

    pulseInterval = setInterval(() => {
        if (!pointSource) return;

        pointSource.getFeatures().forEach(f => {
            if (f.get('isPulsing')) f.changed();
        });
    }, 30);
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



