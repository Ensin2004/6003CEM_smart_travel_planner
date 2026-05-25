import axiosClient from './axiosClient';
import axios from 'axios';

export const getTravelGuideDestinations = (params) =>
  axiosClient.get('/travel-guide/destinations', { params });

export const getTravelGuideDestinationDetails = (params) =>
  axiosClient.get('/travel-guide/destination', { params });

export const getTravelGuideCountries = () =>
  axios.get('https://restcountries.com/v3.1/all', {
    params: {
      fields: 'name,cca2,flags,region,subregion,continents,latlng,currencies',
    },
  });
