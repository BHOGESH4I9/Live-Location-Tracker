import { useEffect, useState } from 'react';
import { OPENCAGE_API_KEY } from '../../config/apiConfig';

export const useOfficeAddress = (location) => {
  const [officeAddress, setOfficeAddress] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAddress = async () => {
      try {
        const response = await fetch(
          `https://api.opencagedata.com/geocode/v1/json?q=${location.lat}+${location.lng}&key=${OPENCAGE_API_KEY}&language=en`
        );
        const data = await response.json();
        const result = data.results[0];

        const components = result.components;
        const parts = [
          components.road,
          components.suburb || components.neighbourhood,
          components.city || components.town,
          components.state,
          components.country,
        ];

        const formatted = parts.filter(Boolean).join(', ');
        setOfficeAddress(formatted || result.formatted);
      } catch (err) {
        console.error('Failed to fetch address:', err);
        setOfficeAddress('Unknown Address');
      } finally {
        setLoading(false);
      }
    };

    fetchAddress();
  }, [location]);

  return { officeAddress, loading };
};
