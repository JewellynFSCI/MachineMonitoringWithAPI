$(function () {
    const imageUrl = $('#map').data('image');

    const img = new Image();
    img.src = imageUrl;

    $(img).on('load', function () {
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
            maxZoom: 4
        });

        const map = new ol.Map({
            layers: [imageLayer],
            target: 'map',
            view: view
        });

        view.fit(imageExtent);
    });
});


//#region 'For Img as ProdMap - OpenLayer'
//$(function () {
//    const imageUrl = $('#map').data('image');

//    const img = new Image();
//    img.src = imageUrl;

//    $(img).on('load', function () {
//        const imageWidth = img.naturalWidth;
//        const imageHeight = img.naturalHeight;

//        const imageExtent = [0, 0, imageWidth, imageHeight];

//        const imageLayer = new ol.layer.Image({
//            source: new ol.source.ImageStatic({
//                url: imageUrl,
//                imageExtent: imageExtent,
//                projection: 'PIXELS'
//            })
//        });

//        const pixelProjection = new ol.proj.Projection({
//            code: 'PIXELS',
//            units: 'pixels',
//            extent: imageExtent
//        });

//        const view = new ol.View({
//            projection: pixelProjection,
//            center: [imageWidth / 2, imageHeight / 2],
//            zoom: 1,
//            maxZoom: 4
//        });

//        const map = new ol.Map({
//            layers: [imageLayer],
//            target: 'map',
//            view: view
//        });

//        view.fit(imageExtent);

//        const markers = [];

//        map.on('click', function (evt) {
//            const coordinate = evt.coordinate;

//            const $markerEl = $('<div></div>')
//                .css({
//                    position: 'absolute',
//                    background: 'red',
//                    borderRadius: '50%',
//                    width: '10px',
//                    height: '10px',
//                    cursor: 'pointer'
//                });

//            const marker = new ol.Overlay({
//                position: coordinate,
//                element: $markerEl[0],
//                positioning: 'center-center'
//            });

//            $markerEl.on('click', function (event) {
//                event.stopPropagation();
//                map.removeOverlay(marker);
//                const index = markers.indexOf(marker);
//                if (index !== -1) {
//                    markers.splice(index, 1);
//                }
//            });

//            map.addOverlay(marker);
//            markers.push(marker);
//        });
//    });
//});
//#endregion