// Game Constants and Enums
export const CELL_SIZE = 32;

export const CellType = {
    GRASS: 0,
    ROAD: 1,
    HIGHWAY: 2,
    HOUSE: 3,
    COMMERCIAL: 4,
    WATER: 5,
    TREE: 6,
    BRIDGE: 7
};

export const VehicleType = {
    SEDAN: 'sedan',
    BUS: 'bus',
    TRUCK: 'truck',
    EMERGENCY: 'emergency'
};

export const Tool = {
    PAN: 'pan',
    INSPECT: 'inspect',
    ROAD: 'road',
    HIGHWAY: 'highway',
    HOUSE: 'house',
    COMMERCIAL: 'commercial',
    TREE: 'tree',
    WATER: 'water',
    LIGHT: 'light',
    BULLDOZER: 'bulldozer'
};

export const Direction = {
    NORTH: 0,
    EAST: 1,
    SOUTH: 2,
    WEST: 3
};

export const DX = [0, 1, 0, -1];
export const DY = [-1, 0, 1, 0];

// Palette & Visual Settings
export const PALETTE = {
    grass: '#15803d',
    grassDetail: '#166534',
    waterDeep: '#1e40af',
    waterShallow: '#2563eb',
    waterWave: '#60a5fa',
    road: '#374151',
    roadMarking: '#f3f4f6',
    highway: '#1f2937',
    highwayDivider: '#fbbf24',
    bridge: '#78716c',
    bridgeRailing: '#d6d3d1',
    houseWalls: ['#ef4444', '#f97316', '#eab308', '#ec4899', '#8b5cf6', '#06b6d4'],
    houseRoof: ['#991b1b', '#c2410c', '#a16207', '#9d174d', '#6d28d9', '#0e7490'],
    commercialGlass: '#38bdf8',
    commercialWalls: '#1e293b',
    treeLeafDark: '#047857',
    treeLeafLight: '#10b981',
    treeTrunk: '#78350f',
    windowLit: '#fef08a',
    streetLightGlow: 'rgba(254, 240, 138, 0.45)',
    headlightGlow: 'rgba(254, 249, 195, 0.55)',
    brakeLightGlow: 'rgba(239, 68, 68, 0.7)'
};
