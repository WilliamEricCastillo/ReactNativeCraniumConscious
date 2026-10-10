import React from 'react';
import Svg, {Line, Circle} from 'react-native-svg';
import {colors} from '../theme/theme';

// Decorative neural-network motif; purely native shapes, no image assets.
const NODES = [
  [50, 20], [95, 12], [140, 20], [28, 50], [72, 44], [118, 44], [162, 50],
  [40, 82], [85, 76], [130, 76], [172, 84], [70, 104], [115, 106], [150, 108],
];
const EDGES = [
  [0, 1], [1, 2], [0, 4], [1, 4], [1, 5], [2, 5], [2, 6], [3, 4], [4, 5], [5, 6],
  [3, 7], [4, 8], [5, 9], [6, 10], [7, 8], [8, 9], [9, 10], [8, 11], [9, 12], [10, 13],
  [11, 12], [12, 13], [4, 7], [5, 8],
];

const BrainMark = ({width = 200, height = 120}) => (
  <Svg width={width} height={height} viewBox="0 0 200 120" accessibilityElementsHidden>
    {EDGES.map(([a, b], i) => (
      <Line
        key={i}
        x1={NODES[a][0]}
        y1={NODES[a][1]}
        x2={NODES[b][0]}
        y2={NODES[b][1]}
        stroke={colors.primary}
        strokeOpacity={0.35}
        strokeWidth={1.2}
      />
    ))}
    {NODES.map(([x, y], i) => (
      <Circle
        key={i}
        cx={x}
        cy={y}
        r={i % 3 === 0 ? 4.5 : 3}
        fill={i % 3 === 0 ? colors.primary : colors.blue}
        fillOpacity={0.9}
      />
    ))}
  </Svg>
);

export default BrainMark;
