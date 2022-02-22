window.onload = init;
function init(){
  const mousePositionControl = new ol.control.MousePosition({
    coordinateFormat: function(coord) {
      return ol.coordinate.format(coord, '{x}, {y}', 0);
    }
  });
  const scaleLineControl = new ol.control.ScaleLine();
  const zoomSliderControl = new ol.control.ZoomSlider();
  const zoomToExtentControl = new ol.control.ZoomToExtent({
    extent: [6199349,7932461,6324018,8006452]
  });
  const fullScreenControl = new ol.control.FullScreen();
  const overViewMapControl = new ol.control.OverviewMap({
    collapsed: false,
    layers: [
      new ol.layer.Tile({
        source: new ol.source.OSM()      
      })
    ]
  });
  //const extentMap = [6085806,8010644,6335144,8158627];
  const view = new ol.View({
    //center: [-11957828, 7979541],
    //extent: extentMap,
    center: ol.proj.fromLonLat([56.25, 58.01]),
    zoom: 11,
    maxZoom: 17,
    minZoom: 10,
  });
  const map = new ol.Map({
    view: view,
    target: 'js-map',
    keyboardEventTarget: document,
    controls: ol.control.defaults().extend([
      mousePositionControl,
      scaleLineControl,
      zoomSliderControl,
      zoomToExtentControl,
      fullScreenControl,
      overViewMapControl
    ])
  })

  const popupContainerElement = document.getElementById('popup-coordinates');
  const popup = new ol.Overlay({
    element: popupContainerElement,
    className: 'popup-coordinates',
    //autoPan: true,
    positioning: 'top-right'
  })

  // ************************ \\
  // ****  Базовые слои  **** \\
  // ************************ \\
  
  // Openstreet Map Standard
  const osmStandard = new ol.layer.Tile({
    source: new ol.source.OSM(),
    visible: true,
    title: 'OSMStand'        
  })

  //Yandex Проецирование координат с помощью сторонней библиотеки proj4.js
  var yaExtent = [-20037508.342789244, -20037508.342789244, 20037508.342789244, 20037508.342789244];
  proj4.defs('EPSG:3395', '+proj=merc +lon_0=0 +k=1 +x_0=0 +y_0=0 +ellps=WGS84 +datum=WGS84 +units=m +no_defs');
  ol.proj.proj4.register(proj4);
  ol.proj.get('EPSG:3395').setExtent(yaExtent);

  //Yandex Maps Стандартная карта
  const yandexMapsStandard = new ol.layer.Tile({
    source: new ol.source.XYZ({
      url: 'https://core-renderer-tiles.maps.yandex.net/tiles?l=map&lang=ru_RU&v=2.26.0&x={x}&y={y}&z={z}',
      type: 'base',
      attributions: '© Yandex',
      projection: 'EPSG:3395',
      tileGrid: ol.tilegrid.createXYZ({
        extent: yaExtent
      }),
    }),
    visible: false,
    title: 'YandexStand'
  })

  // Yandex Maps Спутник
  const yandexSAT = new ol.layer.Tile({
    source: new ol.source.XYZ({
      url: 'http://sat0{1-4}.maps.yandex.net/tiles?l=sat&x={x}&y={y}&z={z}',
      attributions: '© Yandex',
      projection: 'EPSG:3395',
      tileGrid: ol.tilegrid.createXYZ({
        extent: yaExtent
      }),
    }),
    visible: false,
    title: 'YandexSAT'
  })

  const baseMapsLayerGroup = new ol.layer.Group({
    layers: [
      osmStandard, yandexMapsStandard, yandexSAT
    ]
  })
  map.addLayer(baseMapsLayerGroup);

  // Переключение базовых слоев
  const baseLayerElements = document.querySelectorAll('.sidebar > input[type=radio]')
  baseLayerElements[0].checked = true;
  for(let baseLayerElement of baseLayerElements){
    baseLayerElement.addEventListener('change', function(){
      let baseLayerElementValue = this.value;
      baseMapsLayerGroup.getLayers().forEach(function(element, index, array){
        let baseLayerName = element.get('title');
        element.setVisible(baseLayerName === baseLayerElementValue)
      })
    })
  }

  // ************************ \\
  // **** Векторные слои **** \\
  // ************************ \\

  const organization_point = new ol.layer.VectorImage({
    source: new ol.source.Vector({
      url: './data/vectors/organization_geojson.geojson',
      format: new ol.format.GeoJSON()
    }),
    /*style: new ol.style.Style({
      stroke: new ol.style.Circle({
        color: 'rgba(0,140,84,0.9)', // 240,0,0,0.5
        radius: 5
      })
    }),*/
    visible: false,
    title: 'org'
  })

  const layerGroup = new ol.layer.Group({
    layers: [ 
      organization_point
    ]
  })
  map.addLayer(layerGroup);

  // Переключение тематических слоев
  const layerElements = document.querySelectorAll('.sidebar > input[type=checkbox]')
  // Снятие чекбокса
  for (var layerElement of layerElements) {
    layerElement.checked = false;
  }
  // Переключение
  for(let layerElement of layerElements){
    layerElement.addEventListener('change', function(){
      let layerElementValue = this.value;
      let aLayer;

      layerGroup.getLayers().forEach(function(element, index, array){
        if(layerElementValue === element.get('title')){
          aLayer = element;
        }
      })
      this.checked ? aLayer.setVisible(true) : aLayer.setVisible(false)
    })
  }

  /*const zoomLevel = view.getZoom(); 
  document.getElementById("zoomLevel").innerHTML = zoomLevel;*/
  //console.log(zoomLevel);
  const DragPanInteraction = new ol.interaction.DragPan;
  map.addInteraction(DragPanInteraction);
  const DragRotateInteraction = new ol.interaction.DragRotate({
    condition: ol.events.condition.altKeyOnly
  })
  map.addInteraction(DragRotateInteraction);

  function displayZoomLevel() {
    const zoomLevel = view.getZoom(); 
    document.getElementById("zoomLevel").innerHTML = Math.round(zoomLevel);
    console.log(zoomLevel);
  }
  document.getElementById("js-map").addEventListener("wheel", displayZoomLevel);
  document.getElementsByClassName('ol-zoom')[0].addEventListener("click", displayZoomLevel);
  document.getElementsByClassName('ol-zoom-extent')[0].addEventListener("click", displayZoomLevel);
  document.getElementsByClassName('ol-zoomslider')[0].addEventListener("click", displayZoomLevel);
}