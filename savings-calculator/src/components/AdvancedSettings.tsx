import React from 'react';
import {FormControl, InputLabel, Select, MenuItem, Paper, Typography, Box} from '@mui/material';

export type CompoundingFrequency = 'daily' | 'monthly' | 'yearly';

interface AdvancedSettingsProps {
    compoundingFrequency: CompoundingFrequency;
    setCompoundingFrequency: (value: CompoundingFrequency) => void;
}

const AdvancedSettings: React.FC<AdvancedSettingsProps> = ({
                                                               compoundingFrequency,
                                                               setCompoundingFrequency,
                                                           }) => {
    return (
        <Paper sx={{p: 2, mb: 3}}>
            <Typography variant="h6" gutterBottom>
                Advanced Settings
            </Typography>
            <Box sx={{minWidth: 120}}>
                <FormControl fullWidth>
                    <InputLabel id="compounding-frequency-label">Compounding Frequency</InputLabel>
                    <Select
                        labelId="compounding-frequency-label"
                        value={compoundingFrequency}
                        label="Compounding Frequency"
                        onChange={(e) => setCompoundingFrequency(e.target.value as CompoundingFrequency)}
                    >
                        <MenuItem value="daily">Daily</MenuItem>
                        <MenuItem value="monthly">Monthly</MenuItem>
                        <MenuItem value="yearly">Yearly</MenuItem>
                    </Select>
                </FormControl>
            </Box>
        </Paper>
    );
};

export default AdvancedSettings;