import { useState, useEffect } from 'react';
import { fetchInsights, fetchInsightsByCategory } from '@/services/insightsService';
import { getLatestWeatherData } from '@/services/weatherService';
import { supabase } from '@/integrations/supabase/client';

export interface DashboardData {
  budget: {
    totalBudget: number;
    revenue: number;
    expenses: number;
    categories: Array<{ name: string; value: number; percentage: number }>;
  };
  housing: {
    medianPrice: number;
    newPermits: number;
    vacancyRate: number;
  };
  crime: {
    crimeRate: number;
    responseTime: string;
    totalIncidents: number;
  };
  education: {
    enrollment: number;
    graduationRate: number;
    teacherRatio: string;
  };
  weather: {
    temperature: number;
    humidity: number;
    airQuality: string;
  };
  transportation: {
    blueLineRidership: number;
    busRoutes: number;
    avgCommute: number;
  };
  demographics: {
    population: number;
    medianAge: number;
    diversityIndex: number;
  };
}

export const useDashboardData = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);

        // Fetch insights from Supabase
        const insights = await fetchInsights();

        // Fetch weather data
        const weatherData = await getLatestWeatherData();

        // Fetch budget data from insights
        const budgetInsights = insights.filter(i => i.category === 'Budget');

        // Process and structure the data
        const dashboardData: DashboardData = {
          budget: {
            totalBudget: 293008066, // FY2025 total from BudgetPage
            revenue: budgetInsights.find(i => i.subcategory === 'Revenue')?.amount || 278000000,
            expenses: budgetInsights.find(i => i.subcategory === 'Expenses')?.amount || 265000000,
            categories: [
              { name: "Education", value: 129570276, percentage: 44.2 },
              { name: "Pensions & Benefits", value: 46120481, percentage: 15.7 },
              { name: "Public Safety", value: 32810322, percentage: 11.2 },
              { name: "Water & Sewer", value: 31742531, percentage: 10.8 },
              { name: "State Assessments", value: 18587631, percentage: 6.3 },
            ]
          },
          housing: {
            medianPrice: insights.find(i => i.category === 'Housing' && i.subcategory === 'Median Price')?.amount || 485000,
            newPermits: insights.find(i => i.category === 'Housing' && i.subcategory === 'Permits')?.amount || 127,
            vacancyRate: insights.find(i => i.category === 'Housing' && i.subcategory === 'Vacancy')?.percentage_of_budget || 3.2,
          },
          crime: {
            crimeRate: insights.find(i => i.category === 'Crime')?.trend_percentage ?
              parseFloat(insights.find(i => i.category === 'Crime')?.trend_percentage || '-12') : -12,
            responseTime: '4.2 min',
            totalIncidents: insights.find(i => i.category === 'Crime' && i.subcategory === 'Total Incidents')?.amount || 2847,
          },
          education: {
            enrollment: insights.find(i => i.category === 'Education' && i.subcategory === 'Enrollment')?.amount || 8234,
            graduationRate: 89.5,
            teacherRatio: '14:1',
          },
          weather: weatherData?.currentConditions ? {
            temperature: Math.round(weatherData.currentConditions.temp),
            humidity: Math.round(weatherData.currentConditions.humidity),
            airQuality: weatherData.currentConditions.uvindex <= 2 ? 'Good' : weatherData.currentConditions.uvindex <= 5 ? 'Moderate' : 'Poor',
          } : {
            temperature: 72,
            humidity: 68,
            airQuality: 'Good',
          },
          transportation: {
            blueLineRidership: 12450, // Default Blue Line daily ridership
            busRoutes: 8,
            avgCommute: 28,
          },
          demographics: {
            population: 54755,
            medianAge: 41.2,
            diversityIndex: 65,
          }
        };

        setData(dashboardData);
        setError(null);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

  return { data, loading, error };
};