import React, { useState, useRef, useEffect } from 'react';

import { LineChart, Line, CartesianGrid, XAxis, YAxis, Legend, Tooltip } from 'recharts';
const data = [{name: 'Page A', uv: 400, pv: 2400, amt: 2400}, {name: 'Page A', uv: 200, pv: 2400, amt: 2400}];

export const MyChart = () => (
    <LineChart width={600} height={300} data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0}}>
        <Line dataKey="uv" />
        <CartesianGrid stroke="#aaa" strokeDasharray="5 5" />
        <Line type="monotone" dataKey="uv" stroke="purple" strokeWidth={2} name="My data series name"/>
        <XAxis dataKey="name" />
        <YAxis label={{ value: 'UV', position: 'insideLeft', angle: -90}}/>
        <Legend align="right" />
        <Tooltip />
    </LineChart>
)

