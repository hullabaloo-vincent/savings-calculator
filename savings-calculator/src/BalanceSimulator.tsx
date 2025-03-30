import React, {useState, useMemo, ChangeEvent} from 'react';
import Papa from 'papaparse';
import {
    Container,
    Box,
    TextField,
    Button,
    Typography,
    Paper,
    Stack,
    IconButton,
    Grid,
    Tabs,
    Tab,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Checkbox,
    FormControlLabel,
    Modal,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import {Line} from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import AdvancedSettings, {CompoundingFrequency} from './components/AdvancedSettings';
import GoalTracker from './components/GoalTracker';
import {SimulationPoint, Scenario, Deposit, TabPanelProps, HelpModalProps} from './types';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const TabPanel: React.FC<TabPanelProps> = ({children, value, index}) => {
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`simple-tabpanel-${index}`}
            aria-labelledby={`simple-tab-${index}`}
            style={{paddingTop: 16}}
        >
            {value === index && <Box>{children}</Box>}
        </div>
    );
};

const HelpModal: React.FC<HelpModalProps> = ({open, onClose}) => {
    return (
        <Modal open={open} onClose={onClose} aria-labelledby="help-modal-title"
               aria-describedby="help-modal-description">
            <Box
                sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: {xs: '90%', sm: 600},
                    bgcolor: 'background.paper',
                    border: '2px solid #000',
                    boxShadow: 24,
                    p: 4,
                }}
            >
                <Typography id="help-modal-title" variant="h6" component="h2" gutterBottom>
                    User Guide
                </Typography>
                <Typography id="help-modal-description" sx={{mt: 2}}>
                    <ul>
                        <li>
                            <strong>Simulation Settings:</strong> Set your initial balance, APY, simulation period, and
                            savings goal.
                        </li>
                        <li>
                            <strong>Advanced Settings:</strong> Choose your compounding frequency and adjust for
                            inflation (annual %
                            discount) and tax rate on interest.
                        </li>
                        <li>
                            <strong>Deposits:</strong> Add one‑time or recurring deposits manually or upload via CSV.
                        </li>
                        <li>
                            <strong>Results:</strong> Run the simulation to see your nominal balance and a "real"
                            balance (inflation‑adjusted).
                        </li>
                        <li>
                            <strong>Scenario Management:</strong> Save, load, overwrite, delete, export, and import
                            scenarios for comparison.
                        </li>
                    </ul>
                </Typography>
                <Box sx={{mt: 2, textAlign: 'right'}}>
                    <Button variant="contained" onClick={onClose}>
                        Close
                    </Button>
                </Box>
            </Box>
        </Modal>
    );
};

const isSameDate = (d1: Date, d2: Date): boolean =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

const simulateBalanceOverTime = (
    initialBalance: number,
    apy: number,
    start: Date,
    target: Date,
    deposits: Deposit[],
    frequency: CompoundingFrequency,
    taxRate: number 
) => {
    let balance = initialBalance;
    let currentDate = new Date(start);
    const simulation: SimulationPoint[] = [];
    const oneTimeAdded: boolean[] = new Array(deposits.length).fill(false);
    let totalDeposited = 0;

    while (currentDate <= target) {
        let interestFactor = 1;
        if (frequency === 'daily') {
            interestFactor = 1 + (Math.pow(1 + apy, 1 / 365) - 1);
        } else if (frequency === 'monthly') {
            interestFactor = currentDate.getDate() === 1 ? Math.pow(1 + apy, 1 / 12) : 1;
        } else if (frequency === 'yearly') {
            interestFactor = currentDate.getMonth() === 0 && currentDate.getDate() === 1 ? 1 + apy : 1;
        }
        // Compute interest earned and apply tax
        const prevBalance = balance;
        const grossInterest = prevBalance * (interestFactor - 1);
        const netInterest = grossInterest * (1 - taxRate / 100);
        balance = prevBalance + netInterest;

        // Process deposits
        for (let i = 0; i < deposits.length; i++) {
            const dep = deposits[i];
            if (dep.recurring) {
                if (currentDate >= dep.date && currentDate.getDate() === dep.day) {
                    balance += dep.amount;
                    totalDeposited += dep.amount;
                }
            } else {
                if (!oneTimeAdded[i] && isSameDate(currentDate, dep.date)) {
                    balance += dep.amount;
                    oneTimeAdded[i] = true;
                    totalDeposited += dep.amount;
                }
            }
        }

        simulation.push({date: currentDate.toISOString().split('T')[0], balance});
        currentDate.setDate(currentDate.getDate() + 1);
    }
    return {simulation, finalBalance: balance, totalDeposited};
};

const BalanceSimulator: React.FC = () => {
    // ----- Tab State -----
    const [tabValue, setTabValue] = useState<number>(0);
    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    // ----- Help Modal State -----
    const [helpOpen, setHelpOpen] = useState<boolean>(false);

    // ----- Simulation Parameters -----
    const [initialBalance, setInitialBalance] = useState<number>(1000.0);
    const [apy, setApy] = useState<number>(0.137);
    const [startDate, setStartDate] = useState<string>('2025-01-01');
    const [targetDate, setTargetDate] = useState<string>('2025-12-31');
    const [goal, setGoal] = useState<number>(20000);

    // ----- Advanced Settings -----
    const [compoundingFrequency, setCompoundingFrequency] = useState<CompoundingFrequency>('daily');
    const [inflationRate, setInflationRate] = useState<number>(2); // 2%
    const [taxRate, setTaxRate] = useState<number>(25); // 25%

    // ----- Deposits -----
    const [depositList, setDepositList] = useState<Deposit[]>([]);
    const [newDepositAmount, setNewDepositAmount] = useState<number>(250);
    const [newDepositDate, setNewDepositDate] = useState<string>('2025-04-08');
    const [newDepositRecurring, setNewDepositRecurring] = useState<boolean>(true);

    // ----- Simulation Results -----
    const [simulationData, setSimulationData] = useState<SimulationPoint[]>([]);
    const [finalBalance, setFinalBalance] = useState<number | null>(null);
    const [totalDeposited, setTotalDeposited] = useState<number>(0);
    const [interestGained, setInterestGained] = useState<number>(0);
    const [realFinalBalance, setRealFinalBalance] = useState<number | null>(null);
    const [realInterestGained, setRealInterestGained] = useState<number>(0);

    // ----- Scenario Comparison -----
    const [scenarios, setScenarios] = useState<Scenario[]>([]);
    const [scenarioName, setScenarioName] = useState<string>('');

    // ----- CSV Handling -----
    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const deposits: Deposit[] = results.data.map((row: any) => {
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
            error: (error) => console.error('Error parsing CSV:', error),
        });
    };

    const downloadExampleCSV = () => {
        const exampleData = `Deposit,Date,Recurring
250,2025-04-08,Y
250,2025-04-22,Y
1000,2025-05-15,N
`;
        const blob = new Blob([exampleData], {type: 'text/csv;charset=utf-8;'});
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'example_deposits.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // ----- Deposit Management -----
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

    // ----- Simulation Execution -----
    const handleSimulate = () => {
        const result = simulateBalanceOverTime(
            initialBalance,
            apy,
            new Date(startDate),
            new Date(targetDate),
            depositList,
            compoundingFrequency,
            taxRate
        );
        setSimulationData(result.simulation);
        setFinalBalance(result.finalBalance);
        setTotalDeposited(result.totalDeposited);
        setInterestGained(result.finalBalance - (initialBalance + result.totalDeposited));

        // Calculate duration in years
        const durationYears =
            (new Date(targetDate).getTime() - new Date(startDate).getTime()) / (365 * 24 * 3600 * 1000);
        // Discount nominal final balance to get real balance
        const realFinal = result.finalBalance / Math.pow(1 + inflationRate / 100, durationYears);
        setRealFinalBalance(realFinal);
        setRealInterestGained(realFinal - (initialBalance + result.totalDeposited));
    };

    // ----- Scenario Saving -----
    const handleSaveScenario = () => {
        const name = scenarioName || prompt('Enter a name for this scenario:') || 'Unnamed Scenario';
        if (finalBalance !== null) {
            const newScenario: Scenario = {
                name,
                simulationData: simulationData.map((point) => ({...point})),
                finalBalance: finalBalance,
                totalDeposited,
                interestGained,
                settings: {
                    initialBalance,
                    apy,
                    startDate,
                    targetDate,
                    compoundingFrequency,
                    goal,
                    inflationRate,
                    taxRate,
                },
                deposits: depositList.map((dep) => ({...dep})),
            };
            setScenarios((prev) => [...prev, newScenario]);
            setScenarioName('');
        }
    };

    // ----- Scenario Loading -----
    const handleLoadScenario = (scenario: Scenario) => {
        setInitialBalance(scenario.settings.initialBalance);
        setApy(scenario.settings.apy);
        setStartDate(scenario.settings.startDate);
        setTargetDate(scenario.settings.targetDate);
        setCompoundingFrequency(scenario.settings.compoundingFrequency);
        setGoal(scenario.settings.goal);
        setInflationRate(scenario.settings.inflationRate);
        setTaxRate(scenario.settings.taxRate);
        setDepositList(
            scenario.deposits.map((dep) => ({
                ...dep,
                date: new Date(dep.date),
            }))
        );
        setSimulationData(scenario.simulationData.map((point) => ({...point})));
        setFinalBalance(scenario.finalBalance);
        setTotalDeposited(scenario.totalDeposited);
        setInterestGained(scenario.interestGained);
    };

    // ----- Scenario Overwrite -----
    const handleOverwriteScenario = (scenarioIndex: number) => {
        if (finalBalance === null) return;
        const updatedScenario: Scenario = {
            name: scenarios[scenarioIndex].name,
            simulationData: simulationData.map((point) => ({...point})),
            finalBalance: finalBalance,
            totalDeposited,
            interestGained,
            settings: {
                initialBalance,
                apy,
                startDate,
                targetDate,
                compoundingFrequency,
                goal,
                inflationRate,
                taxRate,
            },
            deposits: depositList.map((dep) => ({...dep})),
        };
        setScenarios((prev) => {
            const newScenarios = [...prev];
            newScenarios[scenarioIndex] = updatedScenario;
            return newScenarios;
        });
    };

    // ----- Scenario Deletion -----
    const handleDeleteScenario = (scenarioIndex: number) => {
        setScenarios((prev) => prev.filter((_, i) => i !== scenarioIndex));
    };

    // ----- Combined Scenario Chart Data -----
    const scenarioChartData = useMemo(() => {
        if (scenarios.length === 0) return {labels: [], datasets: []};
        const labels = scenarios[0].simulationData.map((point) => point.date);
        const colors = ['#1976d2', '#dc004e', '#2e7d32', '#ed6c02', '#8e24aa'];
        const datasets = scenarios.map((sc, idx) => ({
            label: sc.name,
            data: sc.simulationData.map((point) => point.balance),
            fill: false,
            borderColor: colors[idx % colors.length],
            tension: 0.1,
        }));
        return {labels, datasets};
    }, [scenarios]);

    // ----- Chart Data for Current Simulation -----
    const currentChartData = {
        labels: simulationData.map((point) => point.date),
        datasets: [
            {
                label: 'Nominal Balance',
                data: simulationData.map((point) => point.balance),
                fill: false,
                borderColor: '#1976d2',
                tension: 0.1,
            },
        ],
    };

    // ----- Export/Import Scenarios -----
    const exportScenarios = () => {
        const dataStr = JSON.stringify(scenarios, null, 2);
        const blob = new Blob([dataStr], {type: 'application/json;charset=utf-8;'});
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'scenarios.json');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const importScenarios = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const imported = JSON.parse(event.target?.result as string) as Scenario[];
                setScenarios(imported);
            } catch (error) {
                console.error('Error parsing imported JSON:', error);
            }
        };
        reader.readAsText(file);
    };

    return (
        <Container maxWidth="md" sx={{py: 4}}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{mb: 2}}>
                <Typography variant="h4">Savings Balance Simulator</Typography>
                <Button variant="outlined" onClick={() => setHelpOpen(true)}>
                    Help
                </Button>
            </Stack>

            {/* Help Modal */}
            <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)}/>

            {/* Tabs */}
            <Paper sx={{mb: 3}}>
                <Tabs value={tabValue} onChange={handleTabChange} centered>
                    <Tab label="Settings"/>
                    <Tab label="Deposits"/>
                    <Tab label="Results"/>
                    <Tab label="Comparison"/>
                </Tabs>
            </Paper>
            
            <TabPanel value={tabValue} index={0}>
                <Paper sx={{p: 2, mb: 3}}>
                    <Typography variant="h6" gutterBottom>
                        Simulation Settings
                    </Typography>
                    <Grid container spacing={2}>
                        <Grid size={{xs: 12, sm: 6, md: 3}}>
                            <TextField
                                label="Initial Balance"
                                type="number"
                                fullWidth
                                value={initialBalance}
                                onChange={(e) => setInitialBalance(parseFloat(e.target.value))}
                            />
                        </Grid>
                        <Grid size={{xs: 12, sm: 6, md: 3}}>
                            <TextField
                                label="APY (as decimal)"
                                type="number"
                                fullWidth
                                value={apy}
                                onChange={(e) => setApy(parseFloat(e.target.value))}
                            />
                        </Grid>
                        <Grid size={{xs: 12, sm: 6, md: 3}}>
                            <TextField
                                label="Start Date"
                                type="date"
                                fullWidth
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                InputLabelProps={{shrink: true}}
                            />
                        </Grid>
                        <Grid size={{xs: 12, sm: 6, md: 3}}>
                            <TextField
                                label="Target Date"
                                type="date"
                                fullWidth
                                value={targetDate}
                                onChange={(e) => setTargetDate(e.target.value)}
                                InputLabelProps={{shrink: true}}
                            />
                        </Grid>
                        <Grid size={{xs: 12, sm: 6, md: 3}}>
                            <TextField
                                label="Savings Goal"
                                type="number"
                                fullWidth
                                value={goal}
                                onChange={(e) => setGoal(parseFloat(e.target.value))}
                            />
                        </Grid>
                    </Grid>
                </Paper>
                <AdvancedSettings
                    compoundingFrequency={compoundingFrequency}
                    setCompoundingFrequency={setCompoundingFrequency}
                    inflationRate={inflationRate}
                    setInflationRate={setInflationRate}
                    taxRate={taxRate}
                    setTaxRate={setTaxRate}
                />
            </TabPanel>
            
            <TabPanel value={tabValue} index={1}>
                <Paper sx={{p: 2, mb: 3}}>
                    <Typography variant="h6" gutterBottom>
                        Upload Deposits CSV
                    </Typography>
                    <Box sx={{my: 2}}>
                        <Stack direction={{xs: 'column', sm: 'row'}} spacing={2}>
                            <Button variant="contained" component="label">
                                Upload CSV
                                <input type="file" hidden accept=".csv" onChange={handleFileChange}/>
                            </Button>
                            <Button variant="outlined" onClick={downloadExampleCSV}>
                                Download Example CSV
                            </Button>
                        </Stack>
                    </Box>
                </Paper>
                <Paper sx={{p: 2, mb: 3}}>
                    <Typography variant="h6" gutterBottom>
                        Add a Deposit
                    </Typography>
                    <Grid container spacing={2} alignItems="center">
                        <Grid size={{xs: 12, sm: 4, md: 3}}>
                            <TextField
                                label="Deposit Amount"
                                type="number"
                                fullWidth
                                value={newDepositAmount}
                                onChange={(e) => setNewDepositAmount(parseFloat(e.target.value))}
                            />
                        </Grid>
                        <Grid size={{xs: 12, sm: 4, md: 3}}>
                            <TextField
                                label="Deposit Date"
                                type="date"
                                fullWidth
                                value={newDepositDate}
                                onChange={(e) => setNewDepositDate(e.target.value)}
                                InputLabelProps={{shrink: true}}
                            />
                        </Grid>
                        <Grid size={{xs: 12, sm: 4, md: 3}}>
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
                        <Grid size={{xs: 12, md: 3}}>
                            <Button variant="outlined" fullWidth onClick={addDeposit}>
                                Add Deposit
                            </Button>
                        </Grid>
                    </Grid>
                </Paper>
                {depositList.length > 0 && (
                    <Paper sx={{p: 2}}>
                        <Typography variant="subtitle1">Current Deposits:</Typography>
                        <Box sx={{mt: 2, overflowX: 'auto'}}>
                            <Table size="small" sx={{minWidth: 500}}>
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
                                                <IconButton color="error" onClick={() => removeDeposit(idx)}
                                                            size="small">
                                                    <DeleteIcon/>
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Box>
                    </Paper>
                )}
            </TabPanel>
            
            <TabPanel value={tabValue} index={2}>
                <Box sx={{textAlign: 'center', mb: 3}}>
                    <Button variant="contained" size="large" onClick={handleSimulate}>
                        Run Simulation
                    </Button>
                </Box>
                {finalBalance !== null ? (
                    <Paper sx={{p: 2, mb: 3}}>
                        <Typography variant="h6" gutterBottom>
                            Nominal Final Balance on {targetDate}:{' '}
                            {finalBalance.toLocaleString('en-US', {style: 'currency', currency: 'USD'})}
                        </Typography>
                        <Typography variant="body1" gutterBottom>
                            Nominal Interest Gained:{' '}
                            {interestGained.toLocaleString('en-US', {style: 'currency', currency: 'USD'})}
                        </Typography>
                        <Typography variant="body1" gutterBottom>
                            Total Deposited:{' '}
                            {totalDeposited.toLocaleString('en-US', {style: 'currency', currency: 'USD'})}
                        </Typography>
                        {simulationData.length > 0 && (
                            <Box sx={{mt: 3, height: 300, position: 'relative'}}>
                                <Line
                                    data={currentChartData}
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                    }}
                                />
                            </Box>
                        )}
                        {realFinalBalance !== null && (
                            <>
                                <Typography variant="h6" gutterBottom sx={{mt: 2}}>
                                    Real Final Balance (Inflation-Adjusted):{' '}
                                    {realFinalBalance.toLocaleString('en-US', {style: 'currency', currency: 'USD'})}
                                </Typography>
                                <Typography variant="body1" gutterBottom>
                                    Real Interest Gained:{' '}
                                    {realInterestGained.toLocaleString('en-US', {style: 'currency', currency: 'USD'})}
                                </Typography>
                            </>
                        )}
                    </Paper>
                ) : (
                    <Typography variant="body1">
                        No simulation results yet. Please run the simulation first.
                    </Typography>
                )}
                {finalBalance !== null && <GoalTracker goal={goal} currentBalance={finalBalance}/>}
            </TabPanel>
            
            <TabPanel value={tabValue} index={3}>
                <Paper sx={{p: 2, mb: 3}}>
                    <Typography variant="h6" gutterBottom>
                        Save Current Scenario
                    </Typography>
                    <Stack direction="row" spacing={2}>
                        <TextField
                            label="Scenario Name"
                            value={scenarioName}
                            onChange={(e) => setScenarioName(e.target.value)}
                            sx={{width: '40%', mr: 2}}
                        />
                        <Button variant="outlined" onClick={handleSaveScenario} disabled={finalBalance === null}>
                            Save Scenario
                        </Button>
                    </Stack>
                </Paper>
                <Stack direction="row" spacing={2} sx={{mb: 3}}>
                    <Button variant="outlined" onClick={exportScenarios}>
                        Export Scenarios
                    </Button>
                    <Button variant="outlined" component="label">
                        Import Scenarios
                        <input type="file" hidden accept="application/json" onChange={importScenarios}/>
                    </Button>
                </Stack>
                {scenarios.length > 0 ? (
                    <>
                        <Paper sx={{p: 2, mb: 3}}>
                            <Typography variant="h6" gutterBottom>
                                Saved Scenarios
                            </Typography>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Name</TableCell>
                                        <TableCell>Nominal Final Balance</TableCell>
                                        <TableCell>Total Deposited</TableCell>
                                        <TableCell>Nominal Interest</TableCell>
                                        <TableCell>Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {scenarios.map((sc, i) => (
                                        <TableRow key={i}>
                                            <TableCell>{sc.name}</TableCell>
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
                                                {(sc.finalBalance - (initialBalance + sc.totalDeposited)).toLocaleString('en-US', {
                                                    style: 'currency',
                                                    currency: 'USD',
                                                })}
                                            </TableCell>
                                            <TableCell>
                                                <Stack direction="row" spacing={1}>
                                                    <Button variant="outlined" size="small"
                                                            onClick={() => handleLoadScenario(sc)}>
                                                        Load
                                                    </Button>
                                                    <Button variant="outlined" size="small"
                                                            onClick={() => handleOverwriteScenario(i)}>
                                                        Overwrite
                                                    </Button>
                                                    <Button variant="outlined" size="small"
                                                            onClick={() => handleDeleteScenario(i)}>
                                                        Delete
                                                    </Button>
                                                </Stack>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Paper>
                        <Paper sx={{p: 2}}>
                            <Typography variant="h6" gutterBottom>
                                Combined Scenario Chart
                            </Typography>
                            <Box sx={{height: 300, position: 'relative'}}>
                                <Line
                                    data={scenarioChartData}
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                    }}
                                />
                            </Box>
                        </Paper>
                    </>
                ) : (
                    <Typography variant="body1">
                        No saved scenarios. Run the simulation and save one.
                    </Typography>
                )}
            </TabPanel>
        </Container>
    );
};

export default BalanceSimulator;