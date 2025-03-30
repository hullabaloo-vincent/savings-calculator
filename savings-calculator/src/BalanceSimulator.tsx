import React, { useState, ChangeEvent } from 'react';
import Papa from 'papaparse';
import {
    Container,
    Box,
    TextField,
    Button,
    Typography,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Checkbox,
    FormControlLabel,
    Paper,
    Stack,
    IconButton,
    Grid
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface Deposit {
    amount: number;
    date: Date;
    recurring: boolean;
    day: number;
}

interface SimulationPoint {
    date: string;
    balance: number;
}

const isSameDate = (d1: Date, d2: Date): boolean =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

const BalanceSimulator: React.FC = () => {
    // Simulation parameters
    const [initialBalance, setInitialBalance] = useState<number>(1000.00);
    const [apy, setApy] = useState<number>(0.137);
    const [startDate, setStartDate] = useState<string>('2025-01-01');
    const [targetDate, setTargetDate] = useState<string>('2025-12-31');
    
    const [depositList, setDepositList] = useState<Deposit[]>([]);
    
    const [newDepositAmount, setNewDepositAmount] = useState<number>(250);
    const [newDepositDate, setNewDepositDate] = useState<string>('2025-04-08');
    const [newDepositRecurring, setNewDepositRecurring] = useState<boolean>(true);
    
    const [simulationData, setSimulationData] = useState<SimulationPoint[]>([]);
    const [finalBalance, setFinalBalance] = useState<number | null>(null);
    
    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    const data = results.data;
                    const deposits: Deposit[] = data.map((row: any) => {
                        const parsedDate = new Date(row.Date);
                        return {
                            amount: parseFloat(row.Deposit),
                            date: parsedDate,
                            recurring: row.Recurring.trim().toUpperCase() === 'Y',
                            day: parsedDate.getDate(),
                        };
                    });
                    setDepositList((prev) => [...prev, ...deposits]);
                },
                error: (error) => {
                    console.error('Error parsing CSV:', error);
                }
            });
        }
    };
    
    const downloadExampleCSV = () => {
        const exampleData = `Deposit,Date,Recurring
250,2025-04-08,Y
250,2025-04-22,Y
1000,2025-05-15,N
`;
        const blob = new Blob([exampleData], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'example_deposits.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    const addDeposit = () => {
        const parsedDate = new Date(newDepositDate);
        const deposit: Deposit = {
            amount: newDepositAmount,
            date: parsedDate,
            recurring: newDepositRecurring,
            day: parsedDate.getDate(),
        };
        setDepositList((prev) => [...prev, deposit]);
    };
    
    const removeDeposit = (index: number) => {
        setDepositList((prev) => prev.filter((_, i) => i !== index));
    };
    
    const simulateBalanceOverTime = (
        initialBalance: number,
        apy: number,
        start: Date,
        target: Date,
        deposits: Deposit[]
    ): SimulationPoint[] => {
        const dailyRate = Math.pow(1 + apy, 1 / 365) - 1;
        let balance = initialBalance;
        let currentDate = new Date(start);
        const simulation: SimulationPoint[] = [];
        const oneTimeAdded: boolean[] = new Array(deposits.length).fill(false);

        while (currentDate <= target) {
            balance *= (1 + dailyRate);
            
            deposits.forEach((dep, index) => {
                if (dep.recurring) {
                    if (currentDate >= dep.date && currentDate.getDate() === dep.day) {
                        balance += dep.amount;
                    }
                } else {
                    if (!oneTimeAdded[index] && isSameDate(currentDate, dep.date)) {
                        balance += dep.amount;
                        oneTimeAdded[index] = true;
                    }
                }
            });

            simulation.push({ date: currentDate.toISOString().split('T')[0], balance });
            currentDate.setDate(currentDate.getDate() + 1);
        }
        return simulation;
    };
    
    const handleSimulate = () => {
        const start = new Date(startDate);
        const target = new Date(targetDate);
        const simulation = simulateBalanceOverTime(initialBalance, apy, start, target, depositList);
        setSimulationData(simulation);
        if (simulation.length > 0) {
            setFinalBalance(simulation[simulation.length - 1].balance);
        }
    };
    
    const chartData = {
        labels: simulationData.map((point) => point.date),
        datasets: [
            {
                label: 'Savings Balance',
                data: simulationData.map((point) => point.balance),
                fill: false,
                borderColor: '#1976d2',
                tension: 0.1,
            },
        ],
    };

    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
            <Typography variant="h4" gutterBottom>
                Savings Balance Simulator
            </Typography>
            
            <Paper sx={{ p: 2, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                    Simulation Settings
                </Typography>
                <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <TextField
                            label="Initial Balance"
                            type="number"
                            fullWidth
                            value={initialBalance}
                            onChange={(e) => setInitialBalance(parseFloat(e.target.value))}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <TextField
                            label="APY (as decimal)"
                            type="number"
                            fullWidth
                            value={apy}
                            onChange={(e) => setApy(parseFloat(e.target.value))}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <TextField
                            label="Start Date"
                            type="date"
                            fullWidth
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <TextField
                            label="Target Date"
                            type="date"
                            fullWidth
                            value={targetDate}
                            onChange={(e) => setTargetDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>
                </Grid>
            </Paper>
            
            <Paper sx={{ p: 2, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                    Deposits
                </Typography>
                <Box sx={{ my: 2 }}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        <Button variant="contained" component="label">
                            Upload CSV
                            <input type="file" hidden accept=".csv" onChange={handleFileChange} />
                        </Button>
                        <Button variant="outlined" onClick={downloadExampleCSV}>
                            Download Example CSV
                        </Button>
                    </Stack>
                </Box>
                
                <Grid container spacing={2} alignItems="center">
                    <Grid size={{ xs: 12, sm: 4, md: 3 }}>
                        <TextField
                            label="Deposit Amount"
                            type="number"
                            fullWidth
                            value={newDepositAmount}
                            onChange={(e) => setNewDepositAmount(parseFloat(e.target.value))}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4, md: 3 }}>
                        <TextField
                            label="Deposit Date"
                            type="date"
                            fullWidth
                            value={newDepositDate}
                            onChange={(e) => setNewDepositDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4, md: 3 }}>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={newDepositRecurring}
                                    onChange={(e) => setNewDepositRecurring(e.target.checked)}
                                />
                            }
                            label="Recurring"
                        />
                    </Grid>
                    <Grid size={{ xs: 12, md: 3 }}>
                        <Button variant="outlined" fullWidth onClick={addDeposit}>
                            Add Deposit
                        </Button>
                    </Grid>
                </Grid>
                
                {depositList.length > 0 && (
                    <Box sx={{ mt: 3, overflowX: 'auto' }}>
                        <Typography variant="subtitle1">Current Deposits:</Typography>
                        <Table size="small" sx={{ minWidth: 500 }}>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Amount</TableCell>
                                    <TableCell>Date</TableCell>
                                    <TableCell>Recurring</TableCell>
                                    <TableCell>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {depositList.map((dep, idx) => (
                                    <TableRow key={idx}>
                                        <TableCell>{dep.amount}</TableCell>
                                        <TableCell>{dep.date.toISOString().split('T')[0]}</TableCell>
                                        <TableCell>{dep.recurring ? 'Yes' : 'No'}</TableCell>
                                        <TableCell>
                                            <IconButton
                                                color="error"
                                                onClick={() => removeDeposit(idx)}
                                                size="small"
                                            >
                                                <DeleteIcon />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Box>
                )}
            </Paper>
            
            <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Button variant="contained" size="large" onClick={handleSimulate}>
                    Run Simulation
                </Button>
            </Box>
            
            {finalBalance !== null && (
                <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                        Projected Balance on {targetDate}: ${finalBalance.toFixed(2)}
                    </Typography>
                    {simulationData.length > 0 && (
                        <Box sx={{ mt: 3 }}>
                            <Line
                                data={chartData}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                }}
                                height={300}
                            />
                        </Box>
                    )}
                </Paper>
            )}
        </Container>
    );
};

export default BalanceSimulator;