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
    CircularProgress,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import InfoIcon from '@mui/icons-material/Info';
import UploadIcon from '@mui/icons-material/Upload';
import DownloadIcon from '@mui/icons-material/Download';
import AddIcon from '@mui/icons-material/Add';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SaveIcon from '@mui/icons-material/Save';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FileUploadIcon from '@mui/icons-material/FileUpload';
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
import {getSuggestedTaxRate} from './components/TaxRateHelper';
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
                            inflation (annual % discount)
                            and tax rate on interest.
                        </li>
                        <li>
                            <strong>Deposits:</strong> Add one‑time or recurring deposits manually or upload via CSV.
                        </li>
                        <li>
                            <strong>Results:</strong> Run the simulation to see both nominal and inflation‑adjusted
                            (real) balances.
                        </li>
                        <li>
                            <strong>Scenario Management:</strong> Save, load, overwrite, delete, export, and import
                            scenarios for comparison.
                        </li>
                        <li>
                            <strong>Tax Suggestion:</strong> After running the simulation, if your approximate gross
                            interest implies a
                            different tax bracket than your chosen rate, you’ll get a suggestion to update your tax
                            rate.
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

        const prevBalance = balance;
        const grossInterest = prevBalance * (interestFactor - 1);
        const netInterest = grossInterest * (1 - taxRate / 100);
        balance = prevBalance + netInterest;

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
    // ----- Tab and Help Modal State -----
    const [tabValue, setTabValue] = useState<number>(0);
    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => setTabValue(newValue);
    const [helpOpen, setHelpOpen] = useState<boolean>(false);

    // ----- Simulation Parameters -----
    const [initialBalance, setInitialBalance] = useState<number>(1000);
    const [apy, setApy] = useState<number>(0.137);
    const [startDate, setStartDate] = useState<string>('2025-01-01');
    const [targetDate, setTargetDate] = useState<string>('2025-12-31');
    const [goal, setGoal] = useState<number>(20000);

    // ----- Advanced Settings -----
    const [compoundingFrequency, setCompoundingFrequency] = useState<CompoundingFrequency>('daily');
    const [inflationRate, setInflationRate] = useState<number>(2);
    const [taxRate, setTaxRate] = useState<number>(25);

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
    const [isSimulating, setIsSimulating] = useState<boolean>(false);

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
    const handleSimulate = React.useCallback(async () => {
        setIsSimulating(true);
        
        // Simulate processing time for better UX
        await new Promise(resolve => setTimeout(resolve, 500));
        
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
        
        const durationYears =
            (new Date(targetDate).getTime() - new Date(startDate).getTime()) / (365 * 24 * 3600 * 1000);
        const realFinal = result.finalBalance / Math.pow(1 + inflationRate / 100, durationYears);
        setRealFinalBalance(realFinal);
        setRealInterestGained(realFinal - (initialBalance + result.totalDeposited));

        // Calculate tax suggestion based on approximate gross interest
        const netInterest = result.finalBalance - (initialBalance + result.totalDeposited);
        const approximateGrossInterest = netInterest / (1 - taxRate / 100);
        const suggested = getSuggestedTaxRate(approximateGrossInterest);
        if (Math.round(suggested) !== Math.round(taxRate)) {
            setTaxSuggestion(suggested);
        } else {
            setTaxSuggestion(null);
        }
        
        setIsSimulating(false);
    }, [initialBalance, apy, startDate, targetDate, depositList, compoundingFrequency, taxRate, inflationRate]);

    // ----- Tax Suggestion State -----
    const [taxSuggestion, setTaxSuggestion] = useState<number | null>(null);
    React.useEffect(() => {
        if (finalBalance !== null) {
            handleSimulate();
        }
    }, [taxRate, finalBalance, handleSimulate]);
    
    const applySuggestedTaxRate = () => {
        if (taxSuggestion !== null) {
            setTaxRate(taxSuggestion);
            setTaxSuggestion(null);
        }
    };

    // ----- Scenario Management -----
    const handleSaveScenario = () => {
        const name = scenarioName || prompt('Enter a name for this scenario:') || 'Unnamed Scenario';
        if (finalBalance !== null) {
            const newScenario: Scenario = {
                name,
                simulationData: simulationData.map((point) => ({...point})),
                finalBalance,
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
        <Box>
            <Typography 
                variant="h4" 
                sx={{ 
                    textAlign: { xs: 'center', sm: 'left' },
                    fontSize: { xs: '1.75rem', sm: '2.125rem' },
                    mb: 3
                }}
            >
                Savings Calculator
            </Typography>

            <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)}/>

            <Paper sx={{mb: 3, overflow: 'hidden'}}>
                <Tabs 
                    value={tabValue} 
                    onChange={handleTabChange} 
                    variant="scrollable"
                    scrollButtons="auto"
                    allowScrollButtonsMobile
                    sx={{
                        '& .MuiTab-root': {
                            minWidth: { xs: 'auto', sm: 120 },
                            fontSize: { xs: '0.875rem', sm: '1rem' },
                            fontWeight: 500,
                        }
                    }}
                >
                    <Tab label="Settings"/>
                    <Tab label="Deposits"/>
                    <Tab label="Results"/>
                    <Tab label="Comparison"/>
                </Tabs>
            </Paper>

            <TabPanel value={tabValue} index={0}>
                <Paper sx={{p: { xs: 2, md: 3 }, mb: 3}}>
                    <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                        Simulation Settings
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                        <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
                            <TextField
                                label="Initial Balance"
                                type="number"
                                fullWidth
                                value={initialBalance}
                                onChange={(e) => setInitialBalance(parseFloat(e.target.value))}
                                InputProps={{
                                    startAdornment: <Typography variant="body2" sx={{ mr: 1 }}>$</Typography>,
                                }}
                            />
                        </Box>
                        <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
                            <TextField
                                label="APY (%)"
                                type="number"
                                fullWidth
                                value={(apy * 100).toFixed(2)}
                                onChange={(e) => setApy(parseFloat(e.target.value) / 100)}
                                InputProps={{
                                    endAdornment: <Typography variant="body2" sx={{ ml: 1 }}>%</Typography>,
                                }}
                            />
                        </Box>
                        <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
                            <TextField
                                label="Savings Goal"
                                type="number"
                                fullWidth
                                value={goal}
                                onChange={(e) => setGoal(parseFloat(e.target.value))}
                                InputProps={{
                                    startAdornment: <Typography variant="body2" sx={{ mr: 1 }}>$</Typography>,
                                }}
                            />
                        </Box>
                        <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
                            <TextField
                                label="Start Date"
                                type="date"
                                fullWidth
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                InputLabelProps={{shrink: true}}
                            />
                        </Box>
                        <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
                            <TextField
                                label="Target Date"
                                type="date"
                                fullWidth
                                value={targetDate}
                                onChange={(e) => setTargetDate(e.target.value)}
                                InputLabelProps={{shrink: true}}
                            />
                        </Box>
                    </Box>
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
                <Paper sx={{p: { xs: 2, md: 3 }, mb: 3}}>
                    <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                        Upload Deposits CSV
                    </Typography>
                    <Box sx={{my: 2}}>
                        <Stack direction={{xs: 'column', sm: 'row'}} spacing={2}>
                            <Button 
                                variant="contained" 
                                component="label"
                                startIcon={<UploadIcon />}
                                sx={{ minWidth: { xs: '100%', sm: 'auto' } }}
                            >
                                Upload CSV
                                <input type="file" hidden accept=".csv" onChange={handleFileChange}/>
                            </Button>
                            <Button 
                                variant="outlined" 
                                onClick={downloadExampleCSV}
                                startIcon={<DownloadIcon />}
                                sx={{ minWidth: { xs: '100%', sm: 'auto' } }}
                            >
                                Download Example CSV
                            </Button>
                        </Stack>
                    </Box>
                </Paper>
                <Paper sx={{p: { xs: 2, md: 3 }, mb: 3}}>
                    <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                        Add a Deposit
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'center' }}>
                        <Box sx={{ flex: '1 1 250px', minWidth: 0 }}>
                            <TextField
                                label="Deposit Amount"
                                type="number"
                                fullWidth
                                value={newDepositAmount}
                                onChange={(e) => setNewDepositAmount(parseFloat(e.target.value))}
                                InputProps={{
                                    startAdornment: <Typography variant="body2" sx={{ mr: 1 }}>$</Typography>,
                                }}
                            />
                        </Box>
                        <Box sx={{ flex: '1 1 250px', minWidth: 0 }}>
                            <TextField
                                label="Deposit Date"
                                type="date"
                                fullWidth
                                value={newDepositDate}
                                onChange={(e) => setNewDepositDate(e.target.value)}
                                InputLabelProps={{shrink: true}}
                            />
                        </Box>
                        <Box sx={{ flex: '1 1 250px', minWidth: 0 }}>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={newDepositRecurring}
                                        onChange={(e) => setNewDepositRecurring(e.target.checked)}
                                    />
                                }
                                label="Recurring"
                            />
                        </Box>
                        <Box sx={{ flex: '1 1 250px', minWidth: 0 }}>
                            <Button 
                                variant="contained" 
                                fullWidth 
                                onClick={addDeposit}
                                startIcon={<AddIcon />}
                            >
                                Add Deposit
                            </Button>
                        </Box>
                    </Box>
                </Paper>
                {depositList.length > 0 && (
                    <Paper sx={{p: { xs: 2, md: 3 }}}>
                        <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                            Current Deposits ({depositList.length})
                        </Typography>
                        <Box sx={{mt: 2}}>
                            {depositList.map((dep, idx) => (
                                <Paper 
                                    key={idx} 
                                    sx={{ 
                                        p: 2, 
                                        mb: 2, 
                                        display: 'flex', 
                                        justifyContent: 'space-between', 
                                        alignItems: 'center',
                                        flexDirection: { xs: 'column', sm: 'row' },
                                        gap: 2
                                    }}
                                >
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                                            ${dep.amount.toLocaleString()}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {dep.date.toLocaleDateString()} • {dep.recurring ? 'Recurring' : 'One-time'}
                                        </Typography>
                                    </Box>
                                    <IconButton 
                                        color="error" 
                                        onClick={() => removeDeposit(idx)}
                                        sx={{ 
                                            bgcolor: 'error.light', 
                                            color: 'white',
                                            '&:hover': { bgcolor: 'error.main' }
                                        }}
                                    >
                                        <DeleteIcon/>
                                    </IconButton>
                                </Paper>
                            ))}
                        </Box>
                    </Paper>
                )}
            </TabPanel>

            <TabPanel value={tabValue} index={2}>
                <Box sx={{textAlign: 'center', mb: 4}}>
                    <Button 
                        variant="contained" 
                        size="large" 
                        onClick={handleSimulate}
                        disabled={isSimulating}
                        startIcon={isSimulating ? <CircularProgress size={20} color="inherit" /> : <PlayArrowIcon />}
                        sx={{ 
                            px: 6, 
                            py: 2,
                            fontSize: '1.2rem',
                            borderRadius: 4
                        }}
                    >
                        {isSimulating ? 'Running Simulation...' : 'Run Simulation'}
                    </Button>
                </Box>
                {taxSuggestion !== null && (
                    <Paper sx={{
                        p: { xs: 2, md: 3 }, 
                        mb: 3, 
                        bgcolor: 'warning.light',
                        border: '1px solid',
                        borderColor: 'warning.main',
                        borderRadius: 2
                    }}>
                        <Typography variant="h6" gutterBottom sx={{ color: 'warning.dark' }}>
                            💡 Tax Rate Suggestion
                        </Typography>
                        <Typography variant="body1" sx={{ mb: 2 }}>
                            Based on your approximate pre‑tax interest, a tax bracket
                            of <strong>{taxSuggestion}%</strong> might apply
                            instead of <strong>{taxRate}%</strong>. Would you like to update?
                        </Typography>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                            <Button 
                                variant="contained" 
                                onClick={applySuggestedTaxRate}
                                sx={{ 
                                    bgcolor: 'warning.main',
                                    '&:hover': { bgcolor: 'warning.dark' }
                                }}
                            >
                                Accept {taxSuggestion}%
                            </Button>
                            <Button 
                                variant="outlined" 
                                onClick={() => setTaxSuggestion(null)}
                                sx={{ borderColor: 'warning.main', color: 'warning.main' }}
                            >
                                Ignore
                            </Button>
                        </Stack>
                    </Paper>
                )}
                {finalBalance !== null ? (
                    <>
                                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 3 }}>
                            <Box sx={{ flex: '1 1 250px', minWidth: 0 }}>
                                <Paper sx={{ 
                                    p: 4, 
                                    textAlign: 'center', 
                                    bgcolor: 'primary.main',
                                    color: 'white'
                                }}>
                                    <Typography variant="h6" gutterBottom>
                                        Final Balance
                                    </Typography>
                                    <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                                        {finalBalance.toLocaleString('en-US', {style: 'currency', currency: 'USD'})}
                                    </Typography>
                                </Paper>
                            </Box>
                            <Box sx={{ flex: '1 1 250px', minWidth: 0 }}>
                                <Paper sx={{ 
                                    p: 4, 
                                    textAlign: 'center', 
                                    bgcolor: 'success.main',
                                    color: 'white'
                                }}>
                                    <Typography variant="h6" gutterBottom>
                                        Interest Gained
                                    </Typography>
                                    <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                                        {interestGained.toLocaleString('en-US', {style: 'currency', currency: 'USD'})}
                                    </Typography>
                                </Paper>
                            </Box>
                            <Box sx={{ flex: '1 1 250px', minWidth: 0 }}>
                                <Paper sx={{ 
                                    p: 4, 
                                    textAlign: 'center', 
                                    bgcolor: 'info.main',
                                    color: 'white'
                                }}>
                                    <Typography variant="h6" gutterBottom>
                                        Total Deposited
                                    </Typography>
                                    <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                                        {totalDeposited.toLocaleString('en-US', {style: 'currency', currency: 'USD'})}
                                    </Typography>
                                </Paper>
                            </Box>
                            <Box sx={{ flex: '1 1 250px', minWidth: 0 }}>
                                <Paper sx={{ 
                                    p: 4, 
                                    textAlign: 'center', 
                                    bgcolor: 'secondary.main',
                                    color: 'white'
                                }}>
                                    <Typography variant="h6" gutterBottom>
                                        Real Balance
                                    </Typography>
                                    <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                                        {realFinalBalance?.toLocaleString('en-US', {style: 'currency', currency: 'USD'})}
                                    </Typography>
                                </Paper>
                            </Box>
                        </Box>
                        
                        {simulationData.length > 0 && (
                            <Paper sx={{ p: { xs: 2, md: 3 }, mb: 3 }}>
                                <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                                    Balance Over Time
                                </Typography>
                                <Box sx={{ height: { xs: 250, sm: 300 }, position: 'relative' }}>
                                    <Line
                                        data={currentChartData}
                                        options={{
                                            responsive: true,
                                            maintainAspectRatio: false,
                                            plugins: {
                                                legend: {
                                                    position: 'top' as const,
                                                },
                                            },
                                            scales: {
                                                y: {
                                                    beginAtZero: true,
                                                },
                                            },
                                        }}
                                    />
                                </Box>
                            </Paper>
                        )}
                    </>
                ) : (
                    <Typography variant="body1">
                        No simulation results yet. Please run the simulation first.
                    </Typography>
                )}
                {finalBalance !== null && <GoalTracker goal={goal} currentBalance={finalBalance}/>}
            </TabPanel>

            <TabPanel value={tabValue} index={3}>
                <Paper sx={{p: { xs: 2, md: 3 }, mb: 3}}>
                    <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                        Save Current Scenario
                    </Typography>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        <TextField
                            label="Scenario Name"
                            value={scenarioName}
                            onChange={(e) => setScenarioName(e.target.value)}
                            sx={{ flex: 1 }}
                        />
                        <Button 
                            variant="contained" 
                            onClick={handleSaveScenario} 
                            disabled={finalBalance === null}
                            startIcon={<SaveIcon />}
                            sx={{ minWidth: { xs: '100%', sm: 'auto' } }}
                        >
                            Save Scenario
                        </Button>
                    </Stack>
                </Paper>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{mb: 3}}>
                    <Button 
                        variant="outlined" 
                        onClick={exportScenarios}
                        startIcon={<FileDownloadIcon />}
                        sx={{ minWidth: { xs: '100%', sm: 'auto' } }}
                    >
                        Export Scenarios
                    </Button>
                    <Button 
                        variant="outlined" 
                        component="label"
                        startIcon={<FileUploadIcon />}
                        sx={{ minWidth: { xs: '100%', sm: 'auto' } }}
                    >
                        Import Scenarios
                        <input type="file" hidden accept="application/json" onChange={importScenarios}/>
                    </Button>
                </Stack>
                {scenarios.length > 0 ? (
                    <>
                        <Paper sx={{p: { xs: 2, md: 3 }, mb: 3}}>
                            <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                                Saved Scenarios ({scenarios.length})
                            </Typography>
                            <Box sx={{ display: { xs: 'block', md: 'none' } }}>
                                {scenarios.map((sc, i) => (
                                    <Paper key={i} sx={{ p: 2, mb: 2 }}>
                                        <Typography variant="h6" sx={{ color: 'primary.main', mb: 1 }}>
                                            {sc.name}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                            Final Balance: {sc.finalBalance.toLocaleString('en-US', {
                                                style: 'currency',
                                                currency: 'USD',
                                            })}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                            Interest: {(sc.finalBalance - (sc.settings.initialBalance + sc.totalDeposited)).toLocaleString('en-US', {
                                                style: 'currency',
                                                currency: 'USD',
                                            })}
                                        </Typography>
                                        <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                                            <Button 
                                                variant="outlined" 
                                                size="small"
                                                onClick={() => handleLoadScenario(sc)}
                                                startIcon={<DownloadIcon />}
                                            >
                                                Load
                                            </Button>
                                            <Button 
                                                variant="outlined" 
                                                size="small"
                                                onClick={() => handleOverwriteScenario(i)}
                                                startIcon={<SaveIcon />}
                                            >
                                                Overwrite
                                            </Button>
                                            <Button 
                                                variant="outlined" 
                                                size="small"
                                                onClick={() => handleDeleteScenario(i)}
                                                startIcon={<DeleteIcon />}
                                                color="error"
                                            >
                                                Delete
                                            </Button>
                                        </Stack>
                                    </Paper>
                                ))}
                            </Box>
                            <Box sx={{ display: { xs: 'none', md: 'block' } }}>
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
                                                    {(sc.finalBalance - (sc.settings.initialBalance + sc.totalDeposited)).toLocaleString('en-US', {
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
                            </Box>
                        </Paper>
                        <Paper sx={{p: { xs: 2, md: 3 }}}>
                            <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                                Combined Scenario Chart
                            </Typography>
                            <Box sx={{height: { xs: 250, sm: 300 }, position: 'relative'}}>
                                <Line
                                    data={scenarioChartData}
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        plugins: {
                                            legend: {
                                                position: 'top' as const,
                                            },
                                        },
                                        scales: {
                                            y: {
                                                beginAtZero: true,
                                            },
                                        },
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
            
            {/* Floating Help Button */}
            <Button 
                variant="contained" 
                onClick={() => setHelpOpen(true)}
                startIcon={<InfoIcon />}
                sx={{ 
                    position: 'fixed',
                    bottom: 24,
                    right: 24,
                    borderRadius: '50px',
                    minWidth: 'auto',
                    px: 2,
                    py: 1,
                    fontSize: '0.875rem',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                    zIndex: 1000,
                    '&:hover': {
                        boxShadow: '0 6px 25px rgba(0,0,0,0.2)',
                    }
                }}
            >
                Help
            </Button>
        </Box>
    );
};

export default BalanceSimulator;