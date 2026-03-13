import React from 'react';
import { ConfigPanelProps } from '../../../hubble-sdk';
import { Button, IconButton, Input, Field } from 'hubble-ui';

interface TimezoneEntry {
  label: string;
  tz: string;
}

const ConfigurePanel = ({ config, onConfigChange }: ConfigPanelProps) => {
  const timezones: TimezoneEntry[] = (config.timezones as TimezoneEntry[]) ?? [];

  const update = (updated: TimezoneEntry[]) => {
    onConfigChange({ timezones: updated });
  };

  const handleLabelChange = (index: number, value: string) => {
    const next = timezones.map((entry, i) => (i === index ? { ...entry, label: value } : entry));
    update(next);
  };

  const handleTzChange = (index: number, value: string) => {
    const next = timezones.map((entry, i) => (i === index ? { ...entry, tz: value } : entry));
    update(next);
  };

  const handleRemove = (index: number) => {
    update(timezones.filter((_, i) => i !== index));
  };

  const handleAdd = () => {
    update([...timezones, { label: '', tz: '' }]);
  };

  return (
    <div className="tz-configure-panel">
      {timezones.map((entry, i) => (
        <div key={i} className="tz-configure-row">
          <Field label="Label">
            <Input
              value={entry.label}
              placeholder="e.g. Amsterdam"
              onChange={(e) => handleLabelChange(i, e.target.value)}
            />
          </Field>
          <Field label="Timezone">
            <Input
              value={entry.tz}
              placeholder="e.g. Europe/Amsterdam"
              onChange={(e) => handleTzChange(i, e.target.value)}
            />
          </Field>
          <IconButton icon="trash" onClick={() => handleRemove(i)} />
        </div>
      ))}
      <Button onClick={handleAdd}>Add timezone</Button>
    </div>
  );
};

export default ConfigurePanel;
