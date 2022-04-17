window.onload = init;
function init(){
  //Иконки для контролов
  const house = document.createElement('span');
  house.innerHTML = '<img src="./img/house.png">';
  const overMap = document.createElement('span');
  overMap.innerHTML = '<img src="./img/map.png">';

  const mousePositionControl = new ol.control.MousePosition({
    projection: 'EPSG:4326',
    className: 'ol-mouse-positionn',
    coordinateFormat: function(coordinate) {
      return ol.coordinate.format(coordinate, 'Широта: {y}, Долгота: {x}', 3);
    }
  });
  const scaleLineControl = new ol.control.ScaleLine({
    
  });
  const zoomSliderControl = new ol.control.ZoomSlider();
  const zoomToExtentControl = new ol.control.ZoomToExtent({
    extent: [6199349,7932461,6324018,8006452],
    tipLabel: 'Исходный вид',
    label: house
  });
  //const fullScreenControl = new ol.control.FullScreen();
  const overViewMapControl = new ol.control.OverviewMap({
    className: 'ol-overviewmap ol-custom-overviewmap',
    label: overMap,
    collapseLabel: overMap,
    collapsed: true,
    tipLabel: 'Обзорная карта',
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
      zoom: false,
      attribution: false
    }).extend([
      new ol.control.Zoom({
        className: "ol-zoom new",
        //zoomInLabel: '🔎+',
        //zoomOutLabel: '🔎-',
        zoomInTipLabel: 'Приблизить',
        zoomOutTipLabel: 'Отдалить'
      }),
      new ol.control.Attribution({
        collapsed: false,
        collapsible: false
      }),
      mousePositionControl,
      scaleLineControl,
      zoomSliderControl,
      zoomToExtentControl,
      //fullScreenControl,
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

  const pointStyle = new ol.style.Icon({
    src: 'https://i.ibb.co/7JmhmfN/icons8-pin-32-1.png',
    anchor: [0.5,0.9],
    scale: 0.8
  })

  const organization_point = new ol.layer.Vector({
    source: new ol.source.Vector({
      url: './data/vectors/organization_geojson_new2.geojson',
      format: new ol.format.GeoJSON()
    }),
    /*style: new ol.style.Style({
      image: pointStyle
    }),*/
    style: function (feature, resolution) {
      return pntStyleOther(feature, resolution);
    },
    zIndex: 1,
    visible: true,
    title: 'org'
  })

  // Нахождение местоположения пользователя
  // Создание слоя
  let source = new ol.source.Vector();
  let geolocation_p = new ol.layer.Vector({
    source: source
  });

  // Создание кнопки
  const locate = document.createElement('div');
  locate.className = 'ol-control ol-unselectable locate';
  locate.innerHTML = '<button title="Мое местоположение">➤</button>';
  locate.addEventListener('click', function() {
    switch(source.isEmpty()) {
      case false:
        source.clear();
        map.removeLayer(geolocation_p);
        break;
      case true:
        map.addLayer(geolocation_p);
        let extentt;
        navigator.geolocation.getCurrentPosition(
          function (pos) {
            let coords = [pos.coords.longitude, pos.coords.latitude];
            let accuracy = ol.geom.Polygon.circular(coords, pos.coords.accuracy);
            source.clear();
            source.addFeatures([
              new ol.Feature(accuracy.transform('EPSG:4326', map.getView().getProjection())),
              new ol.Feature(new ol.geom.Point(ol.proj.fromLonLat(coords))),
            ]);
            extentt = source.getExtent();
            map.getView().fit(extentt, {
              maxZoom: 16,
              duration: 500
            });
          },
          function (error) {
            alert(`ERROR: ${error.message}`);
          },
          {
            enableHighAccuracy: true,
          }
        );
        break;
    }
  });
  map.addControl(new ol.control.Control({
    element: locate
  }));

  const organization_plot = new ol.layer.Vector({
    maxZoom: 14,
    source: new ol.source.Vector({
      url: './data/vectors/organization_plot_geojson_new.geojson',
      format: new ol.format.GeoJSON()
    }),
    style: function (feature, resolution) {
      return getStyle1(feature, resolution);
    },
    visible: false,
    title: 'org_plot'
  })

  /*const organization_plot = new ol.layer.Tile({
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
  })*/
    
  getStyle1 = function (feature, resolution) {
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
  };

  const organization_table = new ol.layer.Vector({
    source: new ol.source.Vector({
      url: './data/vectors/organization_table_geojson_new2.geojson',
      format: new ol.format.GeoJSON()
    }),
    visible: true
  })

  const layerGroup = new ol.layer.Group({
    layers: [organization_table, organization_point, organization_plot]
  })
  map.addLayer(layerGroup);

  const selectInteraction = new ol.interaction.Select({
    condition: ol.events.condition.singleClick,
    layers: [organization_point],
    style: new ol.style.Style({
      image: new ol.style.Icon({
        src: 'https://i.ibb.co/9VyWgxG/icons8-pin-32-2.png',
        anchor: [0.5,0.9],
        scale: 1.2
      })
    })
  })
  map.addInteraction(selectInteraction);

  const overlayFeatureName = document.getElementById('feature-name2');
  const overlayFeatureStrt = document.getElementById('feature-strt2');
  const overlayFeatureContact = document.getElementById('feature-contact');
  const overlayFeatureTel = document.getElementById('feature-tel');
  let counter;

  map.on('click', function(e){
    document.getElementById("overlay-container2").setAttribute("style","display: none");
    map.forEachFeatureAtPixel(e.pixel, function(feature, layer){
      let plotKeys = layer.getProperties();
      let plotTitle = plotKeys.title;
      if (plotTitle === 'org') {
        document.getElementById("overlay-container2").setAttribute("style","display: block");
        document.getElementById("info-text").setAttribute("style","display: none");
        // Создание таблицы
        let tabl = document.getElementById('feature-types2');
        tabl.innerHTML = '';
        table = document.createElement('table');
        thead = document.createElement('thead');
        tbody = document.createElement('tbody');
        table.appendChild(thead);
        table.appendChild(tbody);
        document.getElementById('feature-types2').appendChild(table);
        let row_1 = document.createElement('tr');
        let heading_1 = document.createElement('th');
        heading_1.innerHTML = "Вид деятельности";
        let heading_2 = document.createElement('th');
        heading_2.innerHTML = "Категория";
        row_1.appendChild(heading_1);
        row_1.appendChild(heading_2);
        thead.appendChild(row_1);
        // Получение данных
        let clickedFeatureName = feature.get('NAME');
        let clickedFeatureStrt = feature.get('STRT');
        let clickedFeatureContact = feature.get('contact');
        let clickedFeatureTel = feature.get('tel');
        let clickedFeaturesIdorg = feature.get('ID_ORG');
        let typesOfLeasure = [];
        let catsOfLeasure = [];
        let i = 0;
        let sourceFromTable = organization_table.getSource();
        let featuresFromTable = sourceFromTable.getFeatures();
        while (i<347) {
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
        overlayFeatureName.innerHTML = '<b>Название:<br \/></b>'+clickedFeatureName+'<br \/>';
        overlayFeatureStrt.innerHTML = '<b>Адрес:<br \/></b>'+clickedFeatureStrt+'<br \/>';
        overlayFeatureContact.innerHTML = '<b>Контактное лицо:<br \/></b>'+clickedFeatureContact+'<br \/>';
        overlayFeatureTel.innerHTML = '<b>Телефон:<br \/></b>'+clickedFeatureTel+'<br \/>';
      }
    })
  })

  const bb = document.querySelector('#overlay-container2');
  document.getElementById("close-but").addEventListener("click", close_form);
  //document.getElementById("close-but2").addEventListener("click", close_form);
  const cc = document.getElementById("close-but");
  const forma = document.querySelector('#form-org');
  function close_form() {
    bb.style.display = 'none';
    //forma.style.display = 'none';
  };

  map.on('pointermove', function(e){
    var pixel = map.getEventPixel(e.originalEvent);
    var hit = map.hasFeatureAtPixel(pixel);
    map.getViewport().style.cursor = hit ? 'pointer' : '';
  });

  // Переключение тематических слоев
  const layerElements = document.querySelectorAll('.sidebar > input[type=checkbox]')
  // Инициализация чекбоксов
  for (let layerElement of layerElements) {
    layerElement.checked = false;
    if(layerElement.value === 'org'){
      layerElement.checked = true;
    }
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
  // Управление легендой
  const leg_elem = layerElements[1]
  leg_elem.addEventListener('change', function(){
    if (this.checked) {
      document.getElementById("legend").setAttribute("style","display: block");
    } else {
      document.getElementById("legend").setAttribute("style","display: none");
    }
  })

  // Получаем прогноз в массив data
  fetch('https://api.openweathermap.org/data/2.5/weather?id=511196&lang=ru&appid=426033282ca80911b15fead13251e614').then(function (resp) {
    return resp.json() 
  }).then(function (data) {
    document.querySelector('.weather__city').innerHTML = 'Погода в Перми: ' + Math.round(data.main.temp - 273) + '&deg;';
    document.querySelector('.weather__forecast').innerHTML = 'ощущается как ' + Math.round(data.main.feels_like - 273) + '&deg;';
    document.querySelector('.weather__desc').innerHTML = data.weather[0]['description'];
  })

  // Кнопка списка слоев
  const sidebar_element = document.getElementById('sidebar');
  const l_but = document.getElementById('layer-button');
  function layer_button() {
    if (sidebar_element.style.display != 'block') {
      l_but.style.backgroundColor = 'rgba(79, 158, 192, 0.9)';
      sidebar_element.style.display = 'block';
      forma.style.display = 'none';
      dob_but.style.backgroundColor = 'rgba(40, 135, 175, 0.8)';
      filter_element.style.display = 'none';
      filter_but.style.backgroundColor = 'rgba(40, 135, 175, 0.8)'
    } else {
      l_but.style.backgroundColor = 'rgba(40, 135, 175, 0.8)';
      sidebar_element.style.display = 'none'
    }
  }
  document.getElementById('layer-button').addEventListener("click", layer_button);
  document.getElementById('layer-button').addEventListener("mouseover", function(){
    this.style.backgroundColor = 'rgba(79, 158, 192, 0.9)'
  });
  document.getElementById('layer-button').addEventListener("mouseout", function(){
    if (sidebar_element.style.display != 'block') {
      this.style.backgroundColor = 'rgba(40, 135, 175, 0.8)'
    }
  });

  // Кнопка открытия формы
  const dob_but = document.getElementById('dobav-org');
  function dobav_button() {
    if (forma.style.display != 'block') {
      dob_but.style.backgroundColor = 'rgba(79, 158, 192, 0.9)';
      forma.style.display = 'block';
      sidebar_element.style.display = 'none';
      l_but.style.backgroundColor = 'rgba(40, 135, 175, 0.8)';
      filter_element.style.display = 'none';
      filter_but.style.backgroundColor = 'rgba(40, 135, 175, 0.8)'
    } else {
      dob_but.style.backgroundColor = 'rgba(40, 135, 175, 0.8)';
      forma.style.display = 'none'
    }
  }
  document.getElementById('dobav-org').addEventListener("click", dobav_button);
  document.getElementById('dobav-org').addEventListener("mouseover", function(){
    this.style.backgroundColor = 'rgba(79, 158, 192, 0.9)'
  });
  document.getElementById('dobav-org').addEventListener("mouseout", function(){
    if (forma.style.display != 'block') {
      this.style.backgroundColor = 'rgba(40, 135, 175, 0.8)'
    }
  });

  // Кнопка фильтра
  const filter_element = document.getElementById('filter-bar');
  const filter_but = document.getElementById('filter');
  function filter_button() {
    if (filter_element.style.display != 'block') {
      filter_but.style.backgroundColor = 'rgba(79, 158, 192, 0.9)';
      filter_element.style.display = 'block';
      forma.style.display = 'none';
      dob_but.style.backgroundColor = 'rgba(40, 135, 175, 0.8)';
      sidebar_element.style.display = 'none';
      l_but.style.backgroundColor = 'rgba(40, 135, 175, 0.8)'
    } else {
      filter_but.style.backgroundColor = 'rgba(40, 135, 175, 0.8)';
      filter_element.style.display = 'none'
    }
  }
  document.getElementById('filter').addEventListener("click", filter_button);
  document.getElementById('filter').addEventListener("mouseover", function(){
    this.style.backgroundColor = 'rgba(79, 158, 192, 0.9)'
  });
  document.getElementById('filter').addEventListener("mouseout", function(){
    if (filter_element.style.display != 'block') {
      this.style.backgroundColor = 'rgba(40, 135, 175, 0.8)'
    }
  });

  // Функция смены стиля точек при применении фильтра
  arrHealth = [1,2,3,4,6,10,16,19,22,29,31,32,35,36,41,42,43,44,45,46,47,51,53,54,55,57,58,59,60,61,63,64,65,68,69,70,71,72,74,75,78,79,81,82,85,86,87,88,89,94,95,96,98,99,101,102,104,105,107,108,109,111,115,116,117,118,119,121,122,125,127,128]
  arrSport = [1,2,17,26,27,28,29,30,33,34,35,38,40,46,50,58,61,66,73,76,84,85,86,88,90,96,100,108,120,123,127,128]
  arrStudy = [14,21,36,37,54,57,63,67,68,71,85,91,109,111,113]
  arrHandmade = [1,2,4,6,7,11,14,18,20,23,25,26,29,30,35,36,37,39,40,41,47,49,53,54,56,58,62,66,67,68,70,71,72,74,76,79,83,85,86,91,92,93,97,98,100,102,105,106,108,112,113,114,117]
  arrCulture = [2,5,21,36,39,46,47,52,53,61,70,71,91,93,125]
  arrDancing = [1,2,4,7,8,9,10,11,12,13,23,24,26,29,30,31,35,36,39,40,45,46,47,48,54,56,57,66,67,68,71,72,75,77,80,83,85,86,91,93,100,101,102,103,105,106,110,111,112,117,124,125,126,129,130]
  arrOther = [15,29,131]
  const radioElements = document.querySelectorAll('.filter-bar > input[type=radio]')
  radioElements[0].checked = true;
  pntStyleOther = function (feature, resolution) {
    if (feature.get('ID_ORG') < 150 && radioElements[0].checked == true)  {
      return new ol.style.Style({
        image: pointStyle
      });
    }
    if (arrHealth.includes(feature.get('ID_ORG')) && radioElements[1].checked == true)  {
      return new ol.style.Style({
        image: pointStyle
      });
    }
    if (arrSport.includes(feature.get('ID_ORG')) && radioElements[2].checked == true)  {
      return new ol.style.Style({
        image: pointStyle
      });
    }
    if (arrStudy.includes(feature.get('ID_ORG')) && radioElements[3].checked == true)  {
      return new ol.style.Style({
        image: pointStyle
      });
    }
    if (arrHandmade.includes(feature.get('ID_ORG')) && radioElements[4].checked == true)  {
      return new ol.style.Style({
        image: pointStyle
      });
    }
    if (arrCulture.includes(feature.get('ID_ORG')) && radioElements[5].checked == true)  {
      return new ol.style.Style({
        image: pointStyle
      });
    }
    if (arrDancing.includes(feature.get('ID_ORG')) && radioElements[6].checked == true)  {
      return new ol.style.Style({
        image: pointStyle
      });
    }
    if (arrOther.includes(feature.get('ID_ORG')) && radioElements[7].checked == true)  {
      return new ol.style.Style({
        image: pointStyle
      });
    }
  }

  // Обновление слоя при переключении фильтров
  for(let radioElement of radioElements){
    radioElement.addEventListener('change', function(){
      organization_point.getSource().refresh()
    })
  }

  // Измерительные инструменты
  const measuretype = document.querySelectorAll('.measuretype > input[type=radio]')
  measuretype[2].checked = true;
  var mes_Source = new ol.source.Vector();
  var mes_Layer = new ol.layer.Vector({
    source: mes_Source,
    style: new ol.style.Style({
      fill: new ol.style.Fill({
        color: 'rgba(255, 255, 255, 0.2)'
      }),
      stroke: new ol.style.Stroke({
        color: '#ffcc33',
        width: 2
      }),
      image: new ol.style.Circle({
        radius: 7,
        fill: new ol.style.Fill({
          color: '#ffcc33'
        })
      })
    })
  });
  map.addLayer(mes_Layer);

  var draw;
  var sketch;
  var measureTooltipElement;
  var measureTooltip;

  // Формат линии
  var formatLength = function (line) {
    let length = line.getLength();
    let output;
    length2 = length/2;
    if (length2 > 1000) {
      output = (Math.round(length2 / 1000 * 100) / 100 ) + ' ' + 'км';
    } else {
      output = (Math.round(length2)) + ' ' + 'м';
    }
    return output;
  };

  // Формат полигона
  var formatArea = function (polygon) {
    let area = polygon.getArea();
    let output;
    area4 = area/3.5;
    if (area4 > 10000) {
      output = (Math.round(area4 / 1000000 * 100) / 100) + ' ' + 'км<sup>2</sup>';
    } else {
      output = (Math.round(area4 * 100) / 100) + ' ' + 'м<sup>2</sup>';
    }
    return output;
  };

  // Функция измерения
  function addInteraction() {
    let type = (measuretype[1].checked == true ? 'Polygon' : 'LineString');
    if (measuretype[1].checked == true) { type = 'Polygon'; }
    else if (measuretype[0].checked == true) { type = 'LineString'; }
    console.log(type)
    draw = new ol.interaction.Draw({
      source: mes_Source,
      type: type,
      style: new ol.style.Style({
        fill: new ol.style.Fill({
          color: 'rgba(255, 255, 255, 0.5)'
        }),
        stroke: new ol.style.Stroke({
          color: 'rgba(0, 0, 0, 0.5)',
          lineDash: [10, 10],
          width: 2
        }),
        image: new ol.style.Circle({
          radius: 5,
          stroke: new ol.style.Stroke({
            color: 'rgba(0, 0, 0, 0.7)'
          }),
          fill: new ol.style.Fill({
            color: 'rgba(255, 255, 255, 0.5)'
          })
        })
      })
    });
    if (measuretype[2].checked == true /*|| measuretype.value == 'clear'*/) {
      map.removeInteraction(draw);
      if (mes_Layer) { mes_Layer.getSource().clear(); }
      if (measureTooltipElement) {
        let elem = document.getElementsByClassName("tooltip tooltip-static");
        for (let i = elem.length - 1; i >= 0; i--) {
          elem[i].remove();
        }
      }
    } else if (measuretype[1].checked == true || measuretype[0].checked == true) {
      map.addInteraction(draw);
      createMeasureTooltip();
      let listener;
      draw.on('drawstart',
        function (evt) {
          sketch = evt.feature;
          let tooltipCoord = evt.coordinate;
          listener = sketch.getGeometry().on('change', function (evt) {
            let geom = evt.target;
            let output;
            if (geom instanceof ol.geom.Polygon) {
              output = formatArea(geom);
              tooltipCoord = geom.getInteriorPoint().getCoordinates();
            } else if (geom instanceof ol.geom.LineString) {
              output = formatLength(geom);
              tooltipCoord = geom.getLastCoordinate();
            }
            measureTooltipElement.innerHTML = output;
            measureTooltip.setPosition(tooltipCoord);
          });
        }, this
      );
      draw.on('drawend',
        function () {
          measureTooltipElement.className = 'tooltip tooltip-static';
          measureTooltip.setOffset([0, -7]);
          sketch = null;
          measureTooltipElement = null;
          createMeasureTooltip();
          ol.Observable.unByKey(listener);
        }, this
      );
    }
  }

  // Подсказка измерений
  function createMeasureTooltip() {
    if (measureTooltipElement) {
      measureTooltipElement.parentNode.removeChild(measureTooltipElement);
    }
    measureTooltipElement = document.createElement('div');
    measureTooltipElement.className = 'tooltip tooltip-measure';
    measureTooltip = new ol.Overlay({
      element: measureTooltipElement,
      offset: [0, -15],
      positioning: 'bottom-center'
    });
    map.addOverlay(measureTooltip);
  }

  // Изменение типа геометрии
  for(let measuretyp of measuretype){
    measuretyp.addEventListener('change', function(){
      map.removeInteraction(draw);
      addInteraction();
    })
  }

  // Кнопка измерительных инструментов
  const mes_element = document.getElementById('measure');
  const mes_but = document.getElementById('mes-but');
  function mes_button() {
    if (mes_element.style.display != 'block') {
      mes_but.style.backgroundColor = 'rgba(79, 158, 192, 0.9)';
      mes_element.style.display = 'block';
    } else {
      mes_but.style.backgroundColor = 'rgba(40, 135, 175, 0.8)';
      mes_element.style.display = 'none'
    }
  }
  document.getElementById('mes-but').addEventListener("click", mes_button);
  document.getElementById('mes-but').addEventListener("mouseover", function(){
    this.style.backgroundColor = 'rgba(79, 158, 192, 0.9)'
  });
  document.getElementById('mes-but').addEventListener("mouseout", function(){
    if (mes_element.style.display != 'block') {
      this.style.backgroundColor = 'rgba(40, 135, 175, 0.8)'
    }
  });
}