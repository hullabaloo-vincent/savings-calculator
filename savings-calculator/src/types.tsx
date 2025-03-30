export interface SimulationPoint {
    date: string;
    balance: number;
}

export interface Scenario {
    name: string;
    startDate: string;
    targetDate: string;
    simulationData: SimulationPoint[];
    finalBalance: number;
    totalDeposited: number;
    interestGained: number;
}

export interface Deposit {
    amount: number;
    date: Date;
    recurring: boolean;
    day: number;
}

export interface SimulationResult {
    simulation: SimulationPoint[];
    finalBalance: number;
    totalDeposited: number;
}