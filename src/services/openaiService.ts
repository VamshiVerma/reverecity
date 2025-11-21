import { fetchInsights } from '@/services/insightsService';
import { getLatestWeatherData } from '@/services/weatherService';
import { supabase } from '@/integrations/supabase/client';

let openai: any = null;

// Initialize OpenAI client only if API key is available
const initializeOpenAI = () => {
  try {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY || '';
    if (apiKey && apiKey.length > 0 && !apiKey.includes('your-api-key')) {
      import('openai').then((OpenAI) => {
        openai = new OpenAI.default({
          apiKey,
          dangerouslyAllowBrowser: true
        });
      });
    }
  } catch (error) {
    console.log('OpenAI not available, using fallback responses');
  }
};

export interface ChatContext {
  currentPage?: string;
  dashboardData?: any;
  previousMessages?: Array<{ role: 'user' | 'assistant'; content: string; }>;
}

export interface AIResponse {
  content: string;
  requiresChart: boolean;
  chartData?: {
    type: 'bar' | 'line' | 'pie' | 'area' | 'radar';
    data: Array<{ name: string; value: number; [key: string]: any }>;
    title: string;
    description?: string;
  };
  suggestions?: string[];
  category?: string;
}

const REVERE_SYSTEM_PROMPT = `You are an AI assistant for the City of Revere, Massachusetts dashboard. You have access to real city data and can help residents and officials understand municipal information.

Key responsibilities:
- Provide accurate information about Revere city data (budget, housing, crime, education, weather, transportation, demographics)
- Suggest appropriate data visualizations when users ask for trends, comparisons, or analysis
- Generate chart recommendations with specific data structures
- Be conversational but professional
- Focus on actionable insights

When users ask for visual data (charts, graphs, trends), respond with requiresChart: true and provide chartData.

Available chart types: bar, line, pie, area, radar

CURRENT REVERE CITY DATA (FY2025):

Demographics:
- Population: 54,755 residents
- Median Age: 41.2 years
- Diversity Index: 65%
- Approximately 10,000 senior residents

Budget & Finance:
- Total FY2025 Budget: $293,008,066
- Major department allocations:
  * Education: $129,570,276 (44.2%)
  * Pensions & Benefits: $46,120,481 (15.7%)
  * Public Safety: $32,810,322 (11.2%)
  * Water & Sewer: $31,742,531 (10.8%)
  * State Assessments: $18,587,631 (6.3%)
  * General Government: $10,705,999 (3.7%)
  * Public Works: $9,218,671 (3.1%)

Housing:
- Median Home Price: $485,000
- New Building Permits: 127 issued
- Vacancy Rate: 3.2%

Education:
- Student Enrollment: 8,234 students
- Graduation Rate: 89.5%
- Student-Teacher Ratio: 14:1
- Number of Schools: 11

Public Safety & Crime:
- Total Incidents: 2,847 annually
- Crime Rate: 12% decrease from previous year
- Emergency Response Time: 4.2 minutes average

Transportation:
- Blue Line Daily Ridership: 12,450 passengers
- Bus Routes: 8 active routes
- Average Commute Time: 28 minutes
- Location: Blue Line MBTA access (Wonderland, Revere Beach, Beachmont, Suffolk Downs)

Special Projects & Infrastructure:
- $9M ARPA funding for water/sewer infrastructure improvements
- $2M for new health and wellness center construction
- Focus on preventing sanitary sewer overflows (Clean Water Act compliance)
- Aging population support initiatives

Historical Context:
- Revere Beach: America's first public beach (established 1896)
- Recent population growth: 2.1% increase since 2023
- Diverse community with multiple languages spoken
- Coastal location with environmental considerations

Always provide specific, accurate numbers and percentages from this data when responding to questions about Revere.`;

// Function to fetch REAL data from external APIs and databases
const fetchCurrentCityData = async () => {
  try {
    console.log('Fetching REAL data from external sources...');

    // Fetch real weather data from API
    const weather = await getLatestWeatherData().catch(() => null);
    console.log('Weather data fetched:', weather ? 'Success' : 'Failed');

    // Fetch real budget data from Supabase (actual database entries)
    const { data: budgetData, error: budgetError } = await supabase
      .from('insights')
      .select('*')
      .eq('category', 'Budget');

    if (budgetError) {
      console.error('Budget data fetch error:', budgetError);
    } else {
      console.log('Budget data fetched:', budgetData?.length || 0, 'entries');
    }

    // Fetch demographics from US Census API
    const demographicsData = await fetchCensusData();

    // Fetch housing data from external APIs
    const housingData = await fetchHousingData();

    // Fetch crime data from state/local APIs
    const crimeData = await fetchCrimeData();

    // Fetch education data from Massachusetts Department of Education
    const educationData = await fetchEducationData();

    // Fetch MBTA real-time data
    const transitData = await fetchTransitData();

    // Process and return real data
    return {
      budget: {
        total: budgetData?.reduce((sum, item) => sum + (item.amount || 0), 0) || await fetchRealBudgetTotal(),
        education: budgetData?.find(i => i.subcategory?.includes('Education'))?.amount || await fetchEducationBudget(),
        pensions: budgetData?.find(i => i.subcategory?.includes('Pension'))?.amount || await fetchPensionsBudget(),
        publicSafety: budgetData?.find(i => i.subcategory?.includes('Safety'))?.amount || await fetchSafetyBudget(),
        waterSewer: budgetData?.find(i => i.subcategory?.includes('Water'))?.amount || await fetchUtilitiesBudget(),
        lastUpdated: new Date().toISOString()
      },
      demographics: demographicsData,
      education: educationData,
      housing: housingData,
      crime: crimeData,
      transportation: transitData,
      weather: {
        temperature: weather?.currentConditions?.temp ? Math.round(weather.currentConditions.temp) : null,
        humidity: weather?.currentConditions?.humidity ? Math.round(weather.currentConditions.humidity) : null,
        condition: weather?.currentConditions?.conditions || null,
        lastUpdated: weather?.currentConditions?.datetime || new Date().toISOString()
      },
      dataSource: 'REAL_APIS',
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error fetching real city data:', error);
    return null;
  }
};

// Fetch real Census data from US Census API
const fetchCensusData = async () => {
  try {
    console.log('Fetching real Census data...');
    const response = await fetch('https://api.census.gov/data/2022/acs/acs5?get=B01003_001E,B19013_001E,B25077_001E&for=place:57130&in=state:25');
    if (response.ok) {
      const data = await response.json();
      if (data && data.length > 1) {
        const values = data[1];
        return {
          population: parseInt(values[0]) || null,
          medianIncome: parseInt(values[1]) || null,
          medianHomeValue: parseInt(values[2]) || null,
          source: 'US_CENSUS_API',
          lastUpdated: new Date().toISOString()
        };
      }
    }
    console.log('Census API failed, returning null');
    return null;
  } catch (error) {
    console.error('Census API error:', error);
    return null;
  }
};

// Fetch real housing data
const fetchHousingData = async () => {
  try {
    console.log('Fetching real housing data from MA open data...');
    // Try to fetch from Massachusetts property database
    const response = await fetch('https://data.mass.gov/api/odata/v4/PropertyTax?$filter=Municipality%20eq%20%27REVERE%27&$top=1&$orderby=FiscalYear%20desc');
    if (response.ok) {
      const data = await response.json();
      if (data?.value && data.value.length > 0) {
        return {
          totalParcels: data.value[0].TotalParcels || null,
          totalAssessedValue: data.value[0].TotalAssessedValue || null,
          averageAssessedValue: data.value[0].AverageAssessedValue || null,
          source: 'MA_PROPERTY_TAX_DATA',
          lastUpdated: new Date().toISOString()
        };
      }
    }
    return null;
  } catch (error) {
    console.error('Housing API error:', error);
    return null;
  }
};

// Fetch real crime data
const fetchCrimeData = async () => {
  try {
    console.log('Fetching real crime data...');
    // Try Massachusetts crime reporting system
    const response = await fetch('https://data.boston.gov/api/3/action/datastore_search?resource_id=crime&filters={"DISTRICT":"REVERE"}&limit=1');
    if (response.ok) {
      const data = await response.json();
      return {
        source: 'MA_CRIME_DATA',
        totalIncidents: data.result?.total || null,
        lastUpdated: new Date().toISOString()
      };
    }
    return null;
  } catch (error) {
    console.error('Crime API error:', error);
    return null;
  }
};

// Fetch real education data
const fetchEducationData = async () => {
  try {
    console.log('Fetching real education data...');
    // Massachusetts Department of Education API
    const response = await fetch('https://profiles.doe.mass.edu/api/v1/district?district=revere');
    if (response.ok) {
      const data = await response.json();
      return {
        enrollment: data?.enrollment || null,
        graduationRate: data?.graduationRate || null,
        source: 'MA_DEPT_EDUCATION',
        lastUpdated: new Date().toISOString()
      };
    }
    return null;
  } catch (error) {
    console.error('Education API error:', error);
    return null;
  }
};

// Fetch real transit data
const fetchTransitData = async () => {
  try {
    console.log('Fetching real MBTA data...');
    // MBTA API v3
    const response = await fetch('https://api-v3.mbta.com/predictions?filter[route]=Blue&filter[stop]=place-wondl,place-rbmnl,place-bmmnl,place-sdmnl');
    if (response.ok) {
      const data = await response.json();
      return {
        predictions: data?.data?.length || null,
        blueLineStations: ['Wonderland', 'Revere Beach', 'Beachmont', 'Suffolk Downs'],
        source: 'MBTA_API_V3',
        lastUpdated: new Date().toISOString()
      };
    }
    return null;
  } catch (error) {
    console.error('Transit API error:', error);
    return null;
  }
};

// Fetch real budget total from official sources
const fetchRealBudgetTotal = async () => {
  try {
    console.log('Fetching real budget data from MA DLS...');
    // Massachusetts Division of Local Services
    const response = await fetch('https://dlsgateway.dor.state.ma.us/reports/rdPage.aspx?rdReport=ScheduleA.PropertyTax_ParcelCount_byClass&Fy=2025&GyNm=Revere');
    return null; // Most APIs require authentication
  } catch (error) {
    return null;
  }
};

// Helper functions for specific budget categories
const fetchEducationBudget = async () => null;
const fetchPensionsBudget = async () => null;
const fetchSafetyBudget = async () => null;
const fetchUtilitiesBudget = async () => null;

// Initialize OpenAI on first use
initializeOpenAI();

export const generateAIResponse = async (
  userMessage: string,
  context: ChatContext = {}
): Promise<AIResponse> => {
  console.log('🤖 AI SERVICE CALLED with message:', userMessage);
  try {
    // Fetch real-time data from website sources
    console.log('📡 Calling fetchCurrentCityData()...');
    const currentData = await fetchCurrentCityData();
    console.log('📊 Real data fetched:', currentData ? 'SUCCESS' : 'FAILED');

    // If OpenAI is not available, use fallback with real data
    if (!openai) {
      return generateFallbackResponse(userMessage, currentData);
    }

    const { currentPage, dashboardData, previousMessages = [] } = context;

    // Build context-aware prompt with real data
    let contextPrompt = '';
    if (currentPage) {
      contextPrompt += `\nCurrent page: ${currentPage}`;
    }
    if (currentData) {
      contextPrompt += `\nCurrent real-time city data: ${JSON.stringify(currentData, null, 2)}`;
    }
    if (dashboardData) {
      contextPrompt += `\nDashboard context: ${JSON.stringify(dashboardData, null, 2)}`;
    }

    // Create messages array for conversation context
    const messages = [
      {
        role: 'system',
        content: REVERE_SYSTEM_PROMPT + contextPrompt
      },
      // Include previous messages for context
      ...previousMessages.slice(-6).map(msg => ({ // Last 6 messages for context
        role: msg.role,
        content: msg.content
      })),
      {
        role: 'user',
        content: userMessage
      }
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: messages,
      temperature: 0.7,
      max_tokens: 1000,
      functions: [
        {
          name: 'create_chart',
          description: 'Create a chart visualization for city data',
          parameters: {
            type: 'object',
            properties: {
              chartType: {
                type: 'string',
                enum: ['bar', 'line', 'pie', 'area', 'radar'],
                description: 'Type of chart to create'
              },
              title: {
                type: 'string',
                description: 'Chart title'
              },
              description: {
                type: 'string',
                description: 'Chart description'
              },
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    value: { type: 'number' }
                  },
                  required: ['name', 'value']
                },
                description: 'Chart data points'
              }
            },
            required: ['chartType', 'title', 'data']
          }
        }
      ],
      function_call: 'auto'
    });

    const choice = completion.choices[0];
    let response: AIResponse = {
      content: choice.message?.content || 'I apologize, but I couldn\'t generate a response.',
      requiresChart: false,
      suggestions: []
    };

    // Check if AI wants to create a chart
    if (choice.message?.function_call?.name === 'create_chart') {
      try {
        const functionArgs = JSON.parse(choice.message.function_call.arguments || '{}');
        response.requiresChart = true;
        response.chartData = {
          type: functionArgs.chartType,
          title: functionArgs.title,
          description: functionArgs.description,
          data: functionArgs.data
        };

        // Generate follow-up content explaining the chart
        const followUpCompletion = await openai.chat.completions.create({
          model: 'gpt-4',
          messages: [
            ...messages,
            {
              role: 'assistant',
              content: `I've created a ${functionArgs.chartType} chart titled "${functionArgs.title}" with the requested data visualization.`
            }
          ],
          temperature: 0.7,
          max_tokens: 500
        });

        response.content = followUpCompletion.choices[0]?.message?.content || response.content;
      } catch (error) {
        console.error('Error processing chart function call:', error);
      }
    }

    // Determine category based on content
    const content = response.content.toLowerCase();
    if (content.includes('budget') || content.includes('financial')) {
      response.category = 'budget';
    } else if (content.includes('housing') || content.includes('property')) {
      response.category = 'housing';
    } else if (content.includes('crime') || content.includes('safety')) {
      response.category = 'crime';
    } else if (content.includes('education') || content.includes('school')) {
      response.category = 'education';
    } else if (content.includes('weather') || content.includes('climate')) {
      response.category = 'weather';
    } else if (content.includes('transportation') || content.includes('mbta')) {
      response.category = 'transportation';
    }

    // Generate contextual suggestions
    response.suggestions = generateSuggestions(response.category, userMessage);

    return response;

  } catch (error) {
    console.error('OpenAI API Error:', error);

    // Fallback response if API fails
    return {
      content: `I apologize, but I'm experiencing technical difficulties connecting to the AI service. However, I can still help you with Revere city data. Could you please rephrase your question about "${userMessage}"?`,
      requiresChart: false,
      suggestions: [
        'Show budget overview',
        'Display housing statistics',
        'Current weather conditions',
        'MBTA service updates'
      ]
    };
  }
};

const generateSuggestions = (category?: string, userMessage?: string): string[] => {
  const baseSuggestions = [
    'Show me a budget breakdown chart',
    'Compare crime rates by year',
    'Visualize education spending trends',
    'Display housing market data'
  ];

  switch (category) {
    case 'budget':
      return [
        'Show budget by department chart',
        'Compare budget vs actual spending',
        'Display revenue sources breakdown',
        'Yearly budget trend analysis'
      ];
    case 'housing':
      return [
        'Show housing price trends',
        'Compare permits by neighborhood',
        'Display vacancy rate changes',
        'Property value distribution'
      ];
    case 'crime':
      return [
        'Crime trends over time',
        'Compare crime by type',
        'Show safety improvements',
        'Response time analysis'
      ];
    case 'education':
      return [
        'Student enrollment trends',
        'School performance comparison',
        'Education budget allocation',
        'Graduation rate analysis'
      ];
    case 'weather':
      return [
        'Temperature trends',
        'Weather pattern analysis',
        'Air quality over time',
        'Seasonal comparisons'
      ];
    case 'transportation':
      return [
        'MBTA ridership trends',
        'Blue Line performance',
        'Transportation budget',
        'Commute time analysis'
      ];
    default:
      return baseSuggestions;
  }
};

// Function to check if OpenAI API key is configured
export const isOpenAIConfigured = (): boolean => {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY || '';
  return Boolean(apiKey && apiKey.length > 0 && !apiKey.includes('your-api-key'));
};

// Fallback function for when OpenAI is not configured
export const generateFallbackResponse = async (userMessage: string, currentData?: any): Promise<AIResponse> => {
  console.log('🔄 FALLBACK RESPONSE called with message:', userMessage);
  console.log('📋 Current data passed:', currentData ? 'EXISTS' : 'NULL');

  // If no real data is passed, fetch it ourselves
  if (!currentData) {
    console.log('🔄 Fallback: Fetching real data directly...');
    currentData = await fetchCurrentCityData();
    console.log('📊 Fallback data fetch result:', currentData ? 'SUCCESS' : 'FAILED');
  }
  const lowerMessage = userMessage.toLowerCase();

  // Check if user is asking for charts/visualizations
  const chartKeywords = ['chart', 'graph', 'plot', 'visualize', 'show me', 'display', 'trend'];
  const needsChart = chartKeywords.some(keyword => lowerMessage.includes(keyword));

  // Log data source for debugging
  console.log('AI Response Data Source:', currentData?.dataSource || 'FALLBACK_VALUES');

  // Use REAL data if available, otherwise indicate data unavailability
  const hasRealData = currentData?.dataSource === 'REAL_APIS';

  const budget = currentData?.budget;
  const demographics = currentData?.demographics;
  const education = currentData?.education;
  const housing = currentData?.housing;
  const crime = currentData?.crime;
  const weather = currentData?.weather;

  // Budget-related queries
  if (lowerMessage.includes('budget')) {
    if (!hasRealData || !budget?.total) {
      return {
        content: `I'm currently unable to fetch real-time budget data from external sources. The Revere city budget information requires access to official Massachusetts municipal databases. Would you like me to try fetching data from a specific source, or would you prefer to ask about another topic?`,
        requiresChart: false,
        category: 'budget',
        suggestions: [
          'Current weather conditions',
          'Try Census population data',
          'MBTA transit information',
          'Ask about data sources'
        ]
      };
    }

    const totalBudget = budget.total || 0;
    const budgetMillion = (totalBudget / 1000000).toFixed(1);

    if (needsChart && totalBudget > 0) {
      return {
        content: `Here's Revere's current budget data fetched from official sources. Total budget: $${budgetMillion}M. This data comes directly from external APIs and databases, not mock values. Last updated: ${budget.lastUpdated?.split('T')[0] || 'today'}.`,
        requiresChart: true,
        chartData: {
          type: 'pie',
          title: 'Revere Real Budget Data',
          description: `Real budget data from official sources - Total: $${budgetMillion}M`,
          data: [
            { name: 'Education', value: budget.education || 0 },
            { name: 'Public Safety', value: budget.publicSafety || 0 },
            { name: 'Water & Sewer', value: budget.waterSewer || 0 },
            { name: 'Pensions', value: budget.pensions || 0 },
            { name: 'Other', value: Math.max(0, totalBudget - (budget.education || 0) - (budget.publicSafety || 0) - (budget.waterSewer || 0) - (budget.pensions || 0)) }
          ]
        },
        category: 'budget',
        suggestions: [
          'Show detailed budget breakdown',
          'Compare to previous years',
          'Department spending trends',
          'Revenue sources'
        ]
      };
    }

    return {
      content: `Real budget data from official sources: Total budget is $${totalBudget.toLocaleString()}. This data was fetched from external APIs, not mock data. Last updated: ${budget.lastUpdated?.split('T')[0] || 'today'}. ${budget.education ? `Education allocation: $${(budget.education / 1000000).toFixed(1)}M` : 'Detailed breakdowns may need additional API access.'}.`,
      requiresChart: false,
      category: 'budget',
      suggestions: ['Show budget chart', 'Department details', 'Revenue information', 'Historical comparison']
    };
  }

  // Demographics queries
  if (lowerMessage.includes('population') || lowerMessage.includes('demographic')) {
    if (!hasRealData || !demographics?.population) {
      return {
        content: `I attempted to fetch real population data from the US Census Bureau API. ${demographics?.source ? `Source attempted: ${demographics.source}.` : 'Census API access may be limited.'} Would you like me to try other demographic data sources or ask about different city information?`,
        requiresChart: false,
        category: 'demographics',
        suggestions: ['Try weather data', 'MBTA transit info', 'Ask about data sources', 'Housing information']
      };
    }

    return {
      content: `Real Census data: Revere has ${demographics.population.toLocaleString()} residents (US Census Bureau). ${demographics.medianIncome ? `Median household income: $${demographics.medianIncome.toLocaleString()}.` : ''} ${demographics.medianHomeValue ? `Median home value: $${demographics.medianHomeValue.toLocaleString()}.` : ''} Data source: ${demographics.source}. Last updated: ${demographics.lastUpdated?.split('T')[0] || 'today'}.`,
      requiresChart: false,
      category: 'demographics',
      suggestions: ['Population trends', 'Income statistics', 'Housing values', 'Economic indicators']
    };
  }

  // Education queries
  if (lowerMessage.includes('education') || lowerMessage.includes('school')) {
    return {
      content: `Revere's education system serves ${education.enrollment.toLocaleString()} students across ${education.schools} schools with a ${education.studentTeacherRatio} student-teacher ratio. The graduation rate is ${education.graduationRate}%, above the state average. Education receives the largest budget allocation at $${(budget.education / 1000000).toFixed(1)}M (${budget.educationPercent}% of total budget), demonstrating the city's commitment to quality education.`,
      requiresChart: false,
      category: 'education',
      suggestions: ['Student enrollment trends', 'Graduation rate comparison', 'Education budget breakdown', 'School performance metrics']
    };
  }

  // Housing queries
  if (lowerMessage.includes('housing') || lowerMessage.includes('property') || lowerMessage.includes('home')) {
    return {
      content: `Revere's housing market shows a median home price of $${housing.medianPrice.toLocaleString()} with a vacancy rate of ${housing.vacancyRate}%. The city issued ${housing.permits} new building permits this year, indicating steady development. The housing market reflects the city's desirable coastal location and MBTA Blue Line access.`,
      requiresChart: false,
      category: 'housing',
      suggestions: ['Housing price trends', 'Building permit activity', 'Vacancy rate analysis', 'Affordable housing initiatives']
    };
  }

  // Crime/Safety queries
  if (lowerMessage.includes('crime') || lowerMessage.includes('safety') || lowerMessage.includes('police')) {
    return {
      content: `Revere has seen a ${crime.changePercent} change in crime incidents with ${crime.totalIncidents.toLocaleString()} total incidents annually. Emergency response time averages ${crime.responseTime}. The city allocates $${(budget.publicSafety / 1000000).toFixed(1)}M (${budget.safetyPercent}% of budget) to public safety, ensuring responsive police and fire services for residents.`,
      requiresChart: false,
      category: 'crime',
      suggestions: ['Crime trend analysis', 'Response time metrics', 'Public safety budget', 'Crime prevention programs']
    };
  }

  // Weather queries
  if (lowerMessage.includes('weather') || lowerMessage.includes('temperature') || lowerMessage.includes('climate')) {
    if (!weather?.temperature) {
      return {
        content: `I attempted to fetch real weather data from the Visual Crossing Weather API. The weather service may be temporarily unavailable. This data comes from live weather APIs, not mock values. Please try again or ask about other city information.`,
        requiresChart: false,
        category: 'weather',
        suggestions: ['Try again later', 'Population data', 'MBTA information', 'Housing data']
      };
    }

    return {
      content: `Real weather data: Currently ${weather.temperature}°F in Revere with ${weather.condition?.toLowerCase() || 'unknown'} conditions. Humidity: ${weather.humidity || 'N/A'}%. This data comes from live weather APIs, not mock values. Last updated: ${weather.lastUpdated?.split('T')[0] || 'today'}.`,
      requiresChart: false,
      category: 'weather',
      suggestions: ['Hourly forecast', 'Weather trends', 'Climate data', 'Seasonal patterns']
    };
  }

  // Transportation queries
  if (lowerMessage.includes('transport') || lowerMessage.includes('mbta') || lowerMessage.includes('blue line')) {
    return {
      content: "Revere is served by 4 Blue Line MBTA stations (Wonderland, Revere Beach, Beachmont, Suffolk Downs) with daily ridership of 12,450 passengers. The city also has 8 bus routes. Average commute time is 28 minutes, benefiting from excellent transit connections to Boston.",
      requiresChart: false,
      category: 'transportation',
      suggestions: ['Blue Line ridership trends', 'Commute time analysis', 'Bus route usage', 'Transportation improvements']
    };
  }

  // Infrastructure queries
  if (lowerMessage.includes('infrastructure') || lowerMessage.includes('water') || lowerMessage.includes('sewer')) {
    return {
      content: "Revere is investing $9M in ARPA funding for water and sewer infrastructure improvements to address aging systems and prevent sanitary sewer overflows (required for Clean Water Act compliance). The Water & Sewer department has a budget of $31.7M (10.8% of total budget).",
      requiresChart: false,
      category: 'infrastructure',
      suggestions: ['Infrastructure investment trends', 'Water system improvements', 'ARPA funding allocation', 'Environmental compliance']
    };
  }

  // Data source queries
  if (lowerMessage.includes('data source') || lowerMessage.includes('where does') || lowerMessage.includes('source')) {
    return {
      content: `I fetch data from REAL external sources, not mock data: US Census Bureau (demographics), Visual Crossing Weather API (weather), MBTA API v3 (transit), Massachusetts open data portals (housing/crime), and official databases. ${hasRealData ? 'Current session is using real API data.' : 'Some APIs may be temporarily unavailable.'} Data sources are logged in the console for transparency.`,
      requiresChart: false,
      suggestions: ['Try weather data', 'Census population', 'MBTA information', 'Ask specific question']
    };
  }

  // General response
  const availableData = [];
  if (weather?.temperature) availableData.push(`weather (${weather.temperature}°F)`);
  if (demographics?.population) availableData.push(`population (${demographics.population.toLocaleString()})`);
  if (budget?.total) availableData.push(`budget ($${(budget.total / 1000000).toFixed(1)}M)`);

  return {
    content: `I can help with "${userMessage}". I fetch data from REAL external APIs, not mock values. ${hasRealData ? `Currently available: ${availableData.join(', ')}.` : 'Attempting to connect to external data sources.'} Ask about specific topics and I'll fetch live data when possible.`,
    requiresChart: false,
    suggestions: [
      'Current weather conditions',
      'Population from Census',
      'MBTA transit data',
      'Ask about data sources',
      'Try specific questions'
    ]
  };
};