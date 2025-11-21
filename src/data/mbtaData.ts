
export interface Stop {
  id: string;
}

export interface StationStop {
  [direction: string]: string[];
}

export interface Station {
  stop_name: string;
  short?: string;
  branches: null | any;
  station: string;
  order: number;
  stops: StationStop;
  accessible: boolean;
  enclosed_bike_parking?: boolean;
  pedal_park?: boolean;
  terminus?: boolean;
}

export interface LineDirection {
  [key: string]: string;
}

export interface TransitLine {
  type: string;
  direction: LineDirection;
  stations: Station[];
}

export interface MBTAData {
  [line: string]: TransitLine;
}

export const mbtaData: MBTAData = {
  "Blue": {
    "type": "rapidtransit",
    "direction": {
      "0": "northbound",
      "1": "southbound"
    },
    "stations": [
      {
        "stop_name": "Wonderland",
        "branches": null,
        "station": "place-wondl",
        "order": 1,
        "stops": {
          "0": ["70060"],
          "1": ["70059"]
        },
        "accessible": true,
        "enclosed_bike_parking": true,
        "pedal_park": true,
        "terminus": true
      },
      {
        "stop_name": "Revere Beach",
        "short": "Revere Bch.",
        "branches": null,
        "station": "place-rbmnl",
        "order": 2,
        "stops": {
          "0": ["70058"],
          "1": ["70057"]
        },
        "accessible": true
      },
      {
        "stop_name": "Beachmont",
        "branches": null,
        "station": "place-bmmnl",
        "order": 3,
        "stops": {
          "0": ["70056"],
          "1": ["70055"]
        },
        "accessible": true
      },
      {
        "stop_name": "Suffolk Downs",
        "short": "Suff. Downs",
        "branches": null,
        "station": "place-sdmnl",
        "order": 4,
        "stops": {
          "0": ["70054"],
          "1": ["70053"]
        },
        "accessible": true
      },
      {
        "stop_name": "Orient Heights",
        "short": "Orient Hts.",
        "branches": null,
        "station": "place-orhte",
        "order": 5,
        "stops": {
          "0": ["70052"],
          "1": ["70051"]
        },
        "accessible": true,
        "enclosed_bike_parking": true
      },
      {
        "stop_name": "Wood Island",
        "branches": null,
        "station": "place-wimnl",
        "order": 6,
        "stops": {
          "0": ["70050"],
          "1": ["70049"]
        },
        "accessible": true,
        "enclosed_bike_parking": true
      },
      {
        "stop_name": "Airport",
        "branches": null,
        "station": "place-aport",
        "order": 7,
        "stops": {
          "0": ["70048"],
          "1": ["70047"]
        },
        "accessible": true
      },
      {
        "stop_name": "Maverick",
        "branches": null,
        "station": "place-mvbcl",
        "order": 8,
        "stops": {
          "0": ["70046"],
          "1": ["70045"]
        },
        "accessible": true,
        "enclosed_bike_parking": true
      },
      {
        "stop_name": "Aquarium",
        "branches": null,
        "station": "place-aqucl",
        "order": 9,
        "stops": {
          "0": ["70044"],
          "1": ["70043"]
        },
        "accessible": true
      },
      {
        "stop_name": "State Street",
        "short": "State St.",
        "branches": null,
        "station": "place-state",
        "order": 10,
        "stops": {
          "0": ["70042"],
          "1": ["70041"]
        },
        "accessible": true
      },
      {
        "stop_name": "Government Center",
        "short": "Gov. Center",
        "branches": null,
        "station": "place-gover",
        "order": 11,
        "stops": {
          "0": ["70040"],
          "1": ["70039"]
        },
        "accessible": true
      },
      {
        "stop_name": "Bowdoin",
        "branches": null,
        "station": "place-bomnl",
        "order": 12,
        "stops": {
          "0": ["70038"],
          "1": ["70838"]
        },
        "accessible": false,
        "terminus": true
      }
    ]
  }
};
