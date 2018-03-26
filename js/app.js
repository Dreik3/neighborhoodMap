"use strict";
var map;
var markers = [];
var largeInfoWindow;
var locations = [{
        title: 'My home',
        location: {lat: 61.799855, lng: 34.358208},
        id: 0,
        info: false
    },{
        title: 'University High Scool',
        location: {lat: 61.80451514, lng: 34.34379649},
        id: 1,
        info: false
    },{
        title: 'Petrozavodsk State University',
        location: {lat: 61.78628932, lng: 34.35302535},
        id: 2,
        info: false
    },{
        title: 'Shopping center "Maxi"',
        location: {lat: 61.7911278, lng: 34.36477342},
        id: 3,
        info: false
    },{
        title: 'Hypermarket "Lenta"',
        location: {lat: 61.79457615, lng: 34.3544201},
        id: 4,
        info: false
    }];
var searchStr = "Find your place";


function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        center: {lat: 61.799855, lng: 34.358208},
        zoom: 15
        });
    showMarkers();
    showListings();
    }

var ViewModel = function() {
    var self = this;
    var places = locations;
    self.shouldShowRow = ko.observableArray();
    self.alreadyHaveInfo = ko.observableArray();
    for (var i = 0; i < places.length; i++) {
        self.shouldShowRow().push(false);
        self.alreadyHaveInfo().push(false);
    };
    self.searchStr = ko.observable(searchStr);
    var newPlaces = [];
    self.showInfo = function(place) {
        if (!self.shouldShowRow()[place.id]) {
            centerToMarker(place);
            var curMarker = markers[place.id];
            populateInfoWindow(curMarker, largeInfoWindow);
            if (!self.alreadyHaveInfo()[place.id]) {
                getPlaceInfo(place);
                self.alreadyHaveInfo()[place.id] = true;
            };
            showPlaceInfo(place);
            self.shouldShowRow()[place.id] = true;
        } else {
            self.shouldShowRow()[place.id] = false;
            closeInfoWindow(largeInfoWindow);
            hidePlaceInfo(place);
        };
    };
    self.filterPlaces = function(searchStr) {
        newPlaces = [];
        for (var i = 0; i < places.length; i++) {
            if (places[i].title.toLowerCase().indexOf(self.searchStr().toLowerCase()) + 1) {
                var count = 0;
                for (var j = 0; j < newPlaces.length; j++) {
                    if (places[i] === newPlaces[j]) {
                        count += count;
                    };
                };
                if (count === 0) {
                    newPlaces.push(places[i]);
                    console.log(newPlaces);
                };
            };
        };
        //refresh markers on map
        replaceMarkers(newPlaces);
        closeInfoWindow(largeInfoWindow);
    };
};

ko.applyBindings(new ViewModel());

function showMarkers() {
    for (var i = 0; i < locations.length; i++) {
        var position = locations[i].location;
        var title = locations[i].title;
        var marker = new google.maps.Marker({
                map: map,
                position: position,
                title: title,
                id: i
            });
        $(`#${marker.id}`).parent().attr("style", "");
        markers.push(marker);
        largeInfoWindow = new google.maps.InfoWindow();
        marker.addListener('click', function(){
           populateInfoWindow(this,largeInfoWindow);
        });
    }
}

function replaceMarkers(places) {
    var placesMap = new Map();

    places.forEach(function(place) {
        placesMap.set(place.id, place);
    });

    markers.forEach(function(marker) {
        if (!placesMap.has(marker.id)) {
            // hide list elements which wasn't chosen
            $(`#${marker.id}`).parent().attr("style", "display:none");
            //hide markers which wasn't chosen
            marker.setVisible(false);
        } else {
            //show marker which we created earlier
            marker.setVisible(true);
            //delete marker from map,so we don't need to create them again
            placesMap.delete(marker.placeId);
        }
    });
}
function populateInfoWindow(marker, infowindow) {
    if (infowindow.marker != marker) {
        infowindow.setContent('');
        infowindow.marker = marker;
        infowindow.addListener('closeclick', function() {
            infowindow.marker = null;
        });
        var streetViewService = new google.maps.StreetViewService();
        var radius = 50;
        function getStreetView(data, status) {
            if (status == google.maps.StreetViewStatus.OK) {
              var nearStreetViewLocation = data.location.latLng;
              var heading = google.maps.geometry.spherical.computeHeading(
                nearStreetViewLocation, marker.position);
                infowindow.setContent('<div>' + marker.title + '</div><div id="pano"></div>');
                var panoramaOptions = {
                  position: nearStreetViewLocation,
                  pov: {
                    heading: heading,
                    pitch: 30
                  }
                };
              var panorama = new google.maps.StreetViewPanorama(
                document.getElementById('pano'), panoramaOptions);
            } else {
              infowindow.setContent('<div>' + marker.title + '</div>' +
                '<div>No Street View Found</div>');
            }
        }
        streetViewService.getPanoramaByLocation(marker.position, radius, getStreetView);
        // Open the infowindow on the correct marker.

        infowindow.open(map, marker);
    }
}

function showListings() {
        var bounds = new google.maps.LatLngBounds();
        for (var i = 0; i < markers.length; i++) {
          markers[i].setMap(map);
          bounds.extend(markers[i].position);
        }
        map.fitBounds(bounds);
}

//will be changed for wiki api request (ahhaha will be changed for some information about this place from wikipedia)
function getPlaceInfo(place) {
    var articleStr = "";
    var wikiUrl = "https://en.wikipedia.org/w/api.php?action=opensearch&search="
                  + place.title + '&format=json&callback=wikiCallback';
    //set timeout for wikipedia ajax request
    var wikiRequestTimeout = setTimeout(function(){
            $wikiElem.text("failed to get wikipedia resources");
        }, 8000);
    $.ajax({
        url: wikiUrl,
        dataType: "jsonp",
        success: function(response){
            var articleList = response[1];
            if (articleList.length > 0) {
                for (var i = 0; i < articleList.length; i++){
                    articleStr = articleList[i];
                    var url = "https://en.wikipedia.org/wiki/" + articleStr;
                    $(`#${place.id}`).append(`<li> <a href="${url}" target="_blank">${articleStr}</a></li>`);
                };
            } else {
                $(`#${place.id}`).append(`<p>Sorry, wikipedia articles about this place wasn't found!</p>`);
            }

            // stop timeout, so $wikiElem won't change to "fail to get wiki request"
            clearTimeout(wikiRequestTimeout);
        }
    });
}
function showPlaceInfo(place) {
    $(`#${place.id}`).attr("style","");
}
function hidePlaceInfo(place) {
    $(`#${place.id}`).attr("style", "display: none");
}
function centerToMarker(place) {
    var marker = markers.find(function(marker) {
        return marker.placeId === place.id;
    });
    if (marker !== undefined) {
        map.panTo({ lat: marker.getPosition().lat(), lng: marker.getPosition().lng() });
    }
}
function closeInfoWindow(infoWindow) {
    if (infoWindow.marker) {
        infoWindow.marker.setAnimation(null);
    }
    infoWindow.marker = null;
    infoWindow.close();
}
