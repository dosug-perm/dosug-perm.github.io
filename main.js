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
    collapsed: true,
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
    controls: ol.control.defaults({
      zoom: false
    }).extend([
      new ol.control.Zoom({
        className: "ol-zoom new"
      }),
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

  const organization_point = new ol.layer.Vector({
    source: new ol.source.Vector({
      url: './data/vectors/organization_geojson_new.geojson',
      format: new ol.format.GeoJSON()
    }),
    zIndex: 1,
    /*style: new ol.style.Style({
      stroke: new ol.style.Circle({
        color: 'rgba(0,140,84,0.9)', // 240,0,0,0.5
        radius: 5
      })
    }),*/
    visible: false,
    title: 'org'
  })

  /*const organization_plot = new ol.layer.Vector({
    maxZoom: 14,
    source: new ol.source.Vector({
      url: './data/vectors/organization_plot_geojson.geojson',
      format: new ol.format.GeoJSON()
    }),
    style: function (feature, resolution) {
      return getStyle1(feature, resolution);
    },
    visible: false,
    title: 'org_plot'
  })*/

  const organization_plot = new ol.layer.Tile({
    source: new ol.source.TileWMS({
      url:"http://ssc.psu.ru:8080/geoserver/st2021/wms",
      params:{
        LAYERS: 'st2021:grp3_organization_plot_new',
        FORMAT: 'image/png',
        TRANSPARENT: true,
      },
    }),
    visible: false,
    title: 'org_plot'
  })
    
  getStyle1 = function (feature, resolution) {
    /*var txt = new ol.style.Text({
      text: "Covid Cases:"+feature.get('29-05-2021'),
      offsetX: 20,
      offsetY: -15,
      font: '12px Calibri,sans-serif',
      fill: new ol.style.Fill({
        color: '#000'
      }),
      stroke: new ol.style.Stroke({
        color: '#fff',
        width: 3
      })
    });*/
    if (feature.get('Plot_popul') <= 3.4999)  {
      return new ol.style.Style({
        fill: new ol.style.Fill({
          color: [239, 243, 255, 0.7]
        }),
        stroke: new ol.style.Stroke({
          color: 'white',
          width: 2
        }),
        //text: txt
      });
    }
    if (feature.get('Plot_popul') >= 3.5 && feature.get('Plot_popul') <= 4.9999)  {
      return new ol.style.Style({
        fill: new ol.style.Fill({
          color: [190, 216, 232, 0.7]
        }),
        stroke: new ol.style.Stroke({
          color: 'white',
          width: 2
        }),
        //text: txt
      });
    }
    if (feature.get('Plot_popul') >= 5 && feature.get('Plot_popul') <= 5.9999)  {
      return new ol.style.Style({
        fill: new ol.style.Fill({
          color: [107, 176, 215, 0.7]
        }),
        stroke: new ol.style.Stroke({
          color: 'white',
          width: 2
        }),
        //text: txt
      });
    }
    if (feature.get('Plot_popul') >= 6 && feature.get('Plot_popul') <= 6.9999)  {
      return new ol.style.Style({
        fill: new ol.style.Fill({
          color: [45, 131, 190, 0.7]
        }),
        stroke: new ol.style.Stroke({
          color: 'white',
          width: 2
        }),
        //text: txt
      });
    }
    if (feature.get('Plot_popul') >= 7)  {
      return new ol.style.Style({
        fill: new ol.style.Fill({
          color: [2, 80, 157, 0.7]
        }),
        stroke: new ol.style.Stroke({
          color: 'white',
          width: 2
        }),
        //text: txt
      });
    }		
    /*for (i = 0; i < 5; i++) {
      if (feature.get('Plot_popul') > (i*diff) && feature.get('29-05-2021') <= ((i+1)*diff) ) {
        return new ol.style.Style({
          fill: new ol.style.Fill({
            color: color[i] // semi-transparent red
          }),
          stroke: new ol.style.Stroke({
            color: 'white',
            lineDash: [4],
            width: 3
          }),
          text:txt
        });
      }
    }*/
  };

  const organization_table = new ol.layer.Vector({
    source: new ol.source.Vector({
      url: './data/vectors/organization_table_geojson_new.geojson',
      format: new ol.format.GeoJSON()
    }),
    visible: true
  })

  const layerGroup = new ol.layer.Group({
    layers: [organization_table, organization_point, organization_plot]
  })
  map.addLayer(layerGroup);


  const overlayContainerElement = document.querySelector('.overlay-container');
  const overlayLayer = new ol.Overlay({
    element: overlayContainerElement
  })

  map.addOverlay(overlayLayer);
  const overlayFeatureName = document.getElementById('feature-name');
  const overlayFeatureStrt = document.getElementById('feature-strt');
  //const overlayFeatureTypes = document.getElementById('feature-types');

  map.on('click', function(e){
    overlayLayer.setPosition(undefined);
    map.forEachFeatureAtPixel(e.pixel, function(feature, layer){
      let plotKeys = layer.getProperties();
      let plotTitle = plotKeys.title;
      if (plotTitle === 'org') {
        // Создание таблицы
        let tabl = document.getElementById('feature-types');
        tabl.innerHTML = '';
        table = document.createElement('table');
        thead = document.createElement('thead');
        tbody = document.createElement('tbody');
        table.appendChild(thead);
        table.appendChild(tbody);
        document.getElementById('feature-types').appendChild(table);
        let row_1 = document.createElement('tr');
        let heading_1 = document.createElement('th');
        heading_1.innerHTML = "Вид деятельности";
        let heading_2 = document.createElement('th');
        heading_2.innerHTML = "Категория";
        row_1.appendChild(heading_1);
        row_1.appendChild(heading_2);
        thead.appendChild(row_1);
        // Получение данных
        let clickedCoordinate = e.coordinate;
        let clickedFeatureName = feature.get('NAME');
        let clickedFeatureStrt = feature.get('STRT');
        let clickedFeaturesIdorg = feature.get('ID_ORG');
        overlayLayer.setPosition(clickedCoordinate);
        let typesOfLeasure = [];
        let catsOfLeasure = [];
        let i = 0;
        let sourceFromTable = organization_table.getSource();
        let featuresFromTable = sourceFromTable.getFeatures();
        while (i<361) {
          let idFromTable = featuresFromTable[i].get('ID');
          let typeFromTable = featuresFromTable[i].get('TYPE');
          let catFromTable = featuresFromTable[i].get('CATEGORY');
          if (idFromTable === clickedFeaturesIdorg) {
            typesOfLeasure.push(typeFromTable);
            catsOfLeasure.push(catFromTable)
          };
          i++
        };
        let lenTypesOfLeasure = typesOfLeasure.length;
        for (let j = 0; j < lenTypesOfLeasure; j++) { 
          let row_2 = document.createElement('tr');
          let row_2_data_1 = document.createElement('td');
          row_2_data_1.innerHTML = String(typesOfLeasure[j]);
          let row_2_data_2 = document.createElement('td');
          row_2_data_2.innerHTML = String(catsOfLeasure[j]);
          row_2.appendChild(row_2_data_1);
          row_2.appendChild(row_2_data_2);
          tbody.appendChild(row_2);
        }
        overlayFeatureName.innerHTML = '<b>Название организации:<br \/></b>'+clickedFeatureName+'<br \/>';
        overlayFeatureStrt.innerHTML = '<b>Адрес:<br \/></b>'+clickedFeatureStrt+'<br \/>';
        //overlayFeatureTypes.innerHTML = '<b>Виды деятельности:<br \/></b>'+typesOfLeasure;
      }
    })
  })

  map.on('pointermove', function(e){
    var pixel = map.getEventPixel(e.originalEvent);
    var hit = map.hasFeatureAtPixel(pixel);
    map.getViewport().style.cursor = hit ? 'pointer' : '';
  });

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

  /*const DragRotateInteraction = new ol.interaction.DragRotate({
    condition: ol.events.condition.altKeyOnly
  })
  map.addInteraction(DragRotateInteraction);

  // Уровень зума
  function displayZoomLevel() {
    const zoomLevel = view.getZoom(); 
    document.getElementById("zoomLevel").innerHTML = Math.round(zoomLevel);
  }
  document.getElementById("js-map").addEventListener("wheel", displayZoomLevel);
  document.getElementsByClassName('ol-zoom')[0].addEventListener("click", displayZoomLevel);
  document.getElementsByClassName('ol-zoom-extent')[0].addEventListener("click", displayZoomLevel);
  document.getElementsByClassName('ol-zoomslider')[0].addEventListener("click", displayZoomLevel);*/
}