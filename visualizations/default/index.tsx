// HubbleClock Visualization
import React, { useEffect, useState } from 'react';
import { useConnectorData, useWidgetConfig } from '@hubble/sdk';
// import { Badge, Field } from 'hubble-ui'; // Available hubble-ui components: Button, IconButton, Input, Select, Slider, Toggle, ColorPicker, StatusDot, Badge, Field, Collapsible
import './style.css';

interface HubbleClockData {
  message: string;
}

const HubbleClockViz = () => {
  const data = useConnectorData<HubbleClockData>();
  const config = useWidgetConfig<{ title?: string }>();

  if (!data) {
    return <div className="hubble-clock-loading">Waiting for data...</div>;
  }

  return (
    <div className="hubble-clock-container">
      {config.title && <h3 className="hubble-clock-title">{config.title}</h3>}
      <p>{data.message}</p>
    </div>
  );
};

export default HubbleClockViz;
