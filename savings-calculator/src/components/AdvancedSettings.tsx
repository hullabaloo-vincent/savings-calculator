import React from 'react';
import {
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Paper,
    Typography,
    Box,
    TextField,
    Stack,
} from '@mui/material';

export type CompoundingFrequency = 'daily' | 'monthly' | 'yearly';

interface AdvancedSettingsProps {
    compoundingFrequency: CompoundingFrequency;
    setCompoundingFrequency: (value: CompoundingFrequency) => void;
    inflationRate: number;
    setInflationRate: (value: number) => void;
    taxRate: number;
    setTaxRate: (value: number) => void;
}

const AdvancedSettings: React.FC<AdvancedSettingsProps> = ({
                                                               compoundingFrequency,
                                                               setCompoundingFrequency,
                                                               inflationRate,
                                                               setInflationRate,
                                                               taxRate,
                                                               setTaxRate,
                                                           }) => {
    return (
        <Paper sx={{p: 2, mb: 3}}>
            <Typography variant="h6" gutterBottom>
                Advanced Settings
            </Typography>
            <Stack spacing={2}>
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
                <TextField
                    label="Inflation Rate (%)"
                    type="number"
                    fullWidth
                    value={inflationRate}
                    onChange={(e) => setInflationRate(parseFloat(e.target.value))}
                />
                <TextField
                    label="Tax Rate (%)"
                    type="number"
                    fullWidth
                    value={taxRate}
                    onChange={(e) => setTaxRate(parseFloat(e.target.value))}
                />
            </Stack>
        </Paper>
    );
};

export default AdvancedSettings;