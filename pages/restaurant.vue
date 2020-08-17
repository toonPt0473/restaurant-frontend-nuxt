<template>
  <div class="container">
    <v-row>
      <v-col cols="8">
        <h1>Restaurant search</h1>
      </v-col>
      <v-col cols="4">
        <form v-on:submit.prevent="onSearch">
          <v-text-field
            v-model="search"
            label="ค้นหาร้านอาหารที่ตั้งอยู่ใน"
            append-outer-icon="mdi-map-marker"
            @click:append-outer="onSearch"
          ></v-text-field>
        </form>
      </v-col>
    </v-row>
    <div id="map"></div>
    <v-data-table
      :headers="headers"
      :items="restaurants"
      :items-per-page="100"
    ></v-data-table>
    <div class="btn-container">
      <v-btn
        v-if="!!mapData.next_page_token"
        large
        color="primary"
        @click="onClickLoadMore"
        >LOAD MORE!</v-btn
      >
    </div>
  </div>
</template>

<script>
import _ from 'lodash'
import mockData from '../static/mock.json'
import axios from 'axios'
import { API_URL, MAP_BOX_TOKEN } from '../config'

export default {
  data() {
    return {
      headers: [
        { text: 'ชื่อร้าน', value: 'name' },
        { text: 'rating', value: 'rating' },
        { text: 'ที่ตั้ง', value: 'vicinity' },
      ],
      map: null,
      mapData: {},
      restaurants: [],
      search: '',
      markerGroup: null,
    }
  },
  async asyncData(context) {
    const [lat, lng] = [13.8283, 100.5285]
    const result = await axios.get(`${API_URL}/place/nearby-search`, {
      params: {
        lat,
        lng,
      },
    })
    return {
      mapData: result.data || {},
      restaurants: _.get(result, 'data.results') || [],
    }
  },
  mounted() {
    const L = require('leaflet')
    this.map = L.map('map', {
      center: [13.8283, 100.5285],
      zoom: 14,
      minZoom: 6,
      keepInView: true,
      zoomControl: false,
      gestureHandling: true,
      scrollWheelZoom: false,
      hash: true,
      maxBounds: [
        [4.19302960536076, 92.79052734375001],
        [22.897683210648072, 108.23730468750001],
      ],
    })

    L.tileLayer(
      `https://api.tiles.mapbox.com/v4/mapbox.streets/{z}/{x}/{y}.png?access_token=${MAP_BOX_TOKEN}`
    ).addTo(this.map)

    L.control
      .zoom({
        position: 'bottomright',
      })
      .addTo(this.map)
    this.map.on('dragend', this.dragend)
    this.addMarkerToMap()
  },
  updated() {},
  methods: {
    addMarkerToMap(fitbound) {
      const LeafIcon = L.Icon.extend({
        options: {
          iconSize: [30, 25],
        },
      })
      if (this.markerGroup) {
        this.map.removeLayer(this.markerGroup)
      }

      const markers = this.restaurants.map((i) => {
        const icon = new LeafIcon({ iconUrl: i.icon })
        const lat = _.get(i, 'geometry.location.lat', false)
        const lng = _.get(i, 'geometry.location.lng', false)
        const marker = L.marker([lat, lng], { icon }).bindPopup(
          `
            <div style="min-width:120px; text-align:center" >
              <h4>${i.name}</h4>
              <img src=${this.getPhotoUrl(
                _.get(i, 'photos[0].photo_reference')
              )} />
            </div>
          `
        )
        return marker
      })
      const feature = L.featureGroup(markers)
      const markerGroup = feature.addTo(this.map)
      this.markerGroup = markerGroup
      if (fitbound) {
        this.map.flyToBounds(feature.getBounds())
      }
    },
    dragend: async function (e) {
      const { lat, lng } = this.map.getCenter()
      const result = await axios.get(`${API_URL}/place/nearby-search`, {
        params: {
          lat,
          lng,
        },
      })
      this.mapData = result.data || {}
      this.restaurants = _.get(result, 'data.results') || []
      this.addMarkerToMap()
    },
    onClickLoadMore: async function () {
      // ส่ง next_page_token ไปให้ loadmore data
      const { lat, lng } = this.map.getCenter()
      const result = await axios.get(`${API_URL}/place/loadmore`, {
        params: {
          pagetoken: this.mapData.next_page_token,
        },
      })
      this.mapData = result.data || {}
      const newRestaurants = _.get(result, 'data.results') || []
      this.restaurants = [...this.restaurants, ...newRestaurants]
      this.addMarkerToMap()
    },
    onSearch: async function () {
      // https://maps.googleapis.com/maps/api/place/textsearch/json?query=restaurants+in+%E0%B8%9A%E0%B8%B2%E0%B8%87%E0%B8%8B%E0%B8%B7%E0%B9%88%E0%B8%AD&key=AIzaSyDSAdhm52gI-SgiMd0JG0fErRTqQT9dqB0
      const result = await axios.get(`${API_URL}/place/textsearch`, {
        params: {
          q: this.search,
        },
      })
      this.mapData = result.data || {}
      this.restaurants = _.get(result, 'data.results') || []
      this.addMarkerToMap(true)
    },
  },
  computed: {
    getPhotoUrl: function () {
      return (phtoRef) =>
        `https://maps.googleapis.com/maps/api/place/photo?key=AIzaSyDSAdhm52gI-SgiMd0JG0fErRTqQT9dqB0&maxwidth=120&photoreference=${phtoRef}`
    },
  },
}
</script>

<style>
@import 'leaflet/dist/leaflet.css';
.container {
  width: 100%;
  max-width: 1200px;
  margin: auto;
}
#map {
  background: #acacac;
  height: 600px;
  margin: 20px 0;
}
.btn-container {
  text-align: center;
}
</style>
