import React from 'react';
import {Paper, Typography, Table, TableHead, TableRow, TableCell, TableBody} from '@mui/material';
import {SimulationPoint} from "../types";

export interface Scenario {
    name: string;
    startDate: string;
    targetDate: string;
    simulationData: SimulationPoint[];
    finalBalance: number;
    totalDeposited: number;
    interestGained: number;
}

interface ScenarioComparisonProps {
    scenarios: Scenario[];
}

const ScenarioComparison: React.FC<ScenarioComparisonProps> = ({scenarios}) => {
    if (scenarios.length === 0) return null;

    return (
        <Paper sx={{p: 2, mb: 3}}>
            <Typography variant="h6" gutterBottom>
                Scenario Comparison
            </Typography>
            <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>Start Date</TableCell>
                        <TableCell>Target Date</TableCell>
                        <TableCell>Final Balance</TableCell>
                        <TableCell>Total Deposited</TableCell>
                        <TableCell>Interest Gained</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {scenarios.map((sc, index) => (
                        <TableRow key={index}>
                            <TableCell>{sc.name}</TableCell>
                            <TableCell>{sc.startDate}</TableCell>
                            <TableCell>{sc.targetDate}</TableCell>
                            <TableCell>
                                {sc.finalBalance.toLocaleString('en-US', {
                                    style: 'currency',
                                    currency: 'USD',
                                })}
                            </TableCell>
                            <TableCell>
                                {sc.totalDeposited.toLocaleString('en-US', {
                                    style: 'currency',
                                    currency: 'USD',
                                })}
                            </TableCell>
                            <TableCell>
                                {sc.interestGained.toLocaleString('en-US', {
                                    style: 'currency',
                                    currency: 'USD',
                                })}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </Paper>
    );
};

export default ScenarioComparison;