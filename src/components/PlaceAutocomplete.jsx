import React, { useRef, useEffect, useState } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';

export default function PlaceAutocomplete({ onPlaceSelect, defaultValue = '', placeholder = 'Search for a place...' }) {
    const [placeAutocomplete, setPlaceAutocomplete] = useState(null);
    const inputRef = useRef(null);
    const places = useMapsLibrary('places');

    useEffect(() => {
        if (!places || !inputRef.current) return;

        const options = {
            fields: ['geometry', 'name', 'formatted_address'],
        };

        setPlaceAutocomplete(new places.Autocomplete(inputRef.current, options));
    }, [places]);

    useEffect(() => {
        if (!placeAutocomplete) return;

        placeAutocomplete.addListener('place_changed', () => {
            const place = placeAutocomplete.getPlace();

            const lat = place.geometry?.location?.lat();
            const lng = place.geometry?.location?.lng();
            const address = place.formatted_address;
            const name = place.name;

            onPlaceSelect({ lat, lng, address, name });
        });
    }, [onPlaceSelect, placeAutocomplete]);

    return (
        <input
            ref={inputRef}
            defaultValue={defaultValue}
            onChange={e => onPlaceSelect({ name: e.target.value })} // Fallback: just update name if typing
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '0.5rem' }}
            placeholder={placeholder}
        />
    );
}
