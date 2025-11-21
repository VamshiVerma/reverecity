
import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Twitter } from "lucide-react";

const TWITTER_ACCOUNTS = [
  {
    handle: "@Revere311",
    name: "Revere 311",
    description: "Official city services and information channel",
    avatarUrl: "https://placehold.co/100x100/9b87f5/ffffff?text=R311"
  },
  {
    handle: "@reverepolice",
    name: "Revere Police",
    description: "Revere Police Department's official account",
    avatarUrl: "https://placehold.co/100x100/9b87f5/ffffff?text=RPD"
  },
  {
    handle: "@RPSCommunicates",
    name: "Revere Public Schools",
    description: "Official Revere Public Schools communications",
    avatarUrl: "https://placehold.co/100x100/9b87f5/ffffff?text=RPS"
  },
  {
    handle: "@CityLabRevere",
    name: "City Lab Revere",
    description: "Revere's innovation and technology initiatives",
    avatarUrl: "https://placehold.co/100x100/9b87f5/ffffff?text=CL"
  },
  {
    handle: "@reverejournal",
    name: "Revere Journal",
    description: "Local news coverage for Revere",
    avatarUrl: "https://placehold.co/100x100/9b87f5/ffffff?text=RJ"
  }
];

interface Tweet {
  id: string;
  text: string;
  date: string;
  likes: number;
  retweets: number;
}

// Mock tweets for demonstration purposes
const MOCK_TWEETS: Record<string, Tweet[]> = {
  "@Revere311": [
    {
      id: "1",
      text: "Reminder: Street sweeping begins tomorrow in Ward 3. Please move your vehicles according to posted signs to avoid tickets.",
      date: "2025-05-03T10:15:00Z",
      likes: 12,
      retweets: 8
    },
    {
      id: "2",
      text: "City Hall will be open extended hours (until 7pm) this Thursday for property tax payments.",
      date: "2025-05-02T14:23:00Z",
      likes: 5,
      retweets: 10
    },
    {
      id: "3",
      text: "Power outage reported in the Beachmont area. Crews are working to restore service. Estimated restoration time: 5pm.",
      date: "2025-05-01T13:05:00Z",
      likes: 7,
      retweets: 25
    },
    {
      id: "4",
      text: "Applications for summer youth employment program are due this Friday at 5pm. Apply online at revere.gov/youth",
      date: "2025-04-30T09:45:00Z",
      likes: 31,
      retweets: 42
    },
    {
      id: "5",
      text: "Beach parking permits are now available online! Avoid the lines and get yours at revere.gov/parking",
      date: "2025-04-28T16:12:00Z",
      likes: 56,
      retweets: 23
    }
  ],
  "@reverepolice": [
    {
      id: "1",
      text: "Be aware: Several car break-ins reported overnight in the Oak Island area. Remember to lock your vehicles and remove valuables.",
      date: "2025-05-03T08:30:00Z",
      likes: 45,
      retweets: 72
    },
    {
      id: "2",
      text: "Traffic alert: Accident at Revere Beach Parkway and Everett Ave cleared. Expect residual delays.",
      date: "2025-05-02T15:10:00Z",
      likes: 7,
      retweets: 18
    },
    {
      id: "3",
      text: "Congratulations to Officer Martinez and Officer Chen on their promotions today! We appreciate your dedicated service to our community.",
      date: "2025-05-01T17:45:00Z",
      likes: 132,
      retweets: 24
    },
    {
      id: "4",
      text: "Join us this Saturday for Coffee with a Cop at Revere Roasters, 9-11am. Great opportunity to meet your neighborhood officers!",
      date: "2025-04-30T10:20:00Z",
      likes: 67,
      retweets: 29
    },
    {
      id: "5",
      text: "Crime prevention tip: Going away for the weekend? Make your home look occupied with lights on timers, and ask a trusted neighbor to collect mail.",
      date: "2025-04-29T13:35:00Z",
      likes: 41,
      retweets: 33
    }
  ],
  "@RPSCommunicates": [
    {
      id: "1",
      text: "Congratulations to Revere High School's Class of 2025! Graduation ceremony will be held at Harry Della Russo Stadium on June 7th at 10am.",
      date: "2025-05-03T12:00:00Z",
      likes: 215,
      retweets: 87
    },
    {
      id: "2",
      text: "Early release day reminder for all schools next Tuesday, May 6th. Students will be dismissed at 12:15pm for teacher professional development.",
      date: "2025-05-02T09:30:00Z",
      likes: 42,
      retweets: 61
    },
    {
      id: "3",
      text: "Proud of our Debate Team for placing 2nd in the State Championship! These students worked incredibly hard and represented RHS with distinction!",
      date: "2025-05-01T14:15:00Z",
      likes: 187,
      retweets: 53
    },
    {
      id: "4",
      text: "Registration for summer enrichment programs now open! Learn more at revere.k12.ma.us/summer",
      date: "2025-04-29T11:20:00Z",
      likes: 39,
      retweets: 45
    },
    {
      id: "5",
      text: "School Committee budget meeting scheduled for tomorrow at 6pm. Public comments welcome. Meeting will be streamed live on our website.",
      date: "2025-04-28T16:45:00Z",
      likes: 12,
      retweets: 8
    }
  ],
  "@CityLabRevere": [
    {
      id: "1",
      text: "Just launched: Our new 311 mobile app! Report issues, request services, and stay informed about city updates. Download now: revere.gov/app",
      date: "2025-05-02T13:25:00Z",
      likes: 57,
      retweets: 43
    },
    {
      id: "2",
      text: "Join us next Thursday for a digital literacy workshop at the Revere Public Library. Free registration at revere.gov/digital",
      date: "2025-05-01T10:30:00Z",
      likes: 23,
      retweets: 15
    },
    {
      id: "3",
      text: "Smart City update: Installation of smart traffic signals completed on Broadway. Early data shows 15% reduction in commute times!",
      date: "2025-04-30T15:45:00Z",
      likes: 67,
      retweets: 29
    },
    {
      id: "4",
      text: "Excited to announce our partnership with MIT Urban Studies for a 6-month climate resilience study focusing on Revere Beach.",
      date: "2025-04-28T11:10:00Z",
      likes: 84,
      retweets: 42
    },
    {
      id: "5",
      text: "City data dashboard now includes real-time updates on air quality, noise levels, and traffic conditions. Check it out at data.revere.gov",
      date: "2025-04-26T14:20:00Z",
      likes: 39,
      retweets: 17
    }
  ],
  "@reverejournal": [
    {
      id: "1",
      text: "BREAKING: City Council approves $18M infrastructure package for Broadway business district improvements.",
      date: "2025-05-03T09:15:00Z",
      likes: 74,
      retweets: 38
    },
    {
      id: "2",
      text: "Revere Beach Summer Festival dates announced: July 15-17. Featuring food vendors, live music, and the annual sand sculpture competition!",
      date: "2025-05-02T11:40:00Z",
      likes: 156,
      retweets: 89
    },
    {
      id: "3",
      text: "Local business spotlight: New artisanal bakery 'Beachmont Bread' opens this weekend on Winthrop Ave.",
      date: "2025-04-30T13:25:00Z",
      likes: 92,
      retweets: 31
    },
    {
      id: "4",
      text: "School Committee votes to expand after-school programs at all elementary schools starting next fall.",
      date: "2025-04-29T15:50:00Z",
      likes: 67,
      retweets: 43
    },
    {
      id: "5",
      text: "Mayor announces new housing initiative aimed at creating 500 affordable units over the next three years.",
      date: "2025-04-27T10:05:00Z",
      likes: 112,
      retweets: 76
    }
  ]
};

const SocialPage = () => {
  const [expandedAccounts, setExpandedAccounts] = useState<Record<string, boolean>>({});

  // Toggle expanded state for an account
  const toggleExpanded = (handle: string) => {
    setExpandedAccounts(prev => ({
      ...prev,
      [handle]: !prev[handle]
    }));
  };

  // Format date to be more readable
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <DashboardLayout pageTitle="Social Media">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gradient">Social Media</h1>
        <p className="text-gray-400 mt-2">
          Stay updated with the latest news and announcements from official Revere accounts.
        </p>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="all">All Accounts</TabsTrigger>
          {TWITTER_ACCOUNTS.map(account => (
            <TabsTrigger key={account.handle} value={account.handle}>
              {account.name}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="all" className="space-y-6 animate-fade-in">
          {TWITTER_ACCOUNTS.map(account => {
            const tweets = MOCK_TWEETS[account.handle] || [];
            const isExpanded = expandedAccounts[account.handle];
            const displayTweets = isExpanded ? tweets : tweets.slice(0, 5);
            
            return (
              <Card key={account.handle} className="bg-card-bg border-gray-800 overflow-hidden">
                <CardHeader className="border-b border-gray-800">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full overflow-hidden">
                      <img src={account.avatarUrl} alt={account.name} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <CardTitle className="text-light-text">{account.name}</CardTitle>
                      <CardDescription>{account.handle}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="max-h-[500px]">
                    <ul className="divide-y divide-gray-800">
                      {displayTweets.map(tweet => (
                        <li key={tweet.id} className="p-4 hover:bg-gray-800/50 transition-colors">
                          <div className="flex flex-col gap-2">
                            <p className="text-light-text">{tweet.text}</p>
                            <div className="flex items-center justify-between text-xs text-gray-400">
                              <span>{formatDate(tweet.date)}</span>
                              <div className="flex items-center gap-4">
                                <span className="flex items-center gap-1">
                                  <MessageSquare className="w-3 h-3" /> {tweet.retweets}
                                </span>
                                <span className="flex items-center gap-1">
                                  ❤️ {tweet.likes}
                                </span>
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                </CardContent>
                <CardFooter className="border-t border-gray-800 p-4">
                  <div className="w-full flex justify-between items-center">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => toggleExpanded(account.handle)}
                      className="text-sm"
                    >
                      {isExpanded ? "Show Less" : "Show More"}
                    </Button>
                    <a 
                      href={`https://twitter.com/${account.handle.substring(1)}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-primary flex items-center gap-1 hover:underline"
                    >
                      <Twitter className="w-3 h-3" /> View on Twitter
                    </a>
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </TabsContent>

        {TWITTER_ACCOUNTS.map(account => (
          <TabsContent key={account.handle} value={account.handle} className="animate-fade-in">
            <Card className="bg-card-bg border-gray-800 overflow-hidden">
              <CardHeader className="border-b border-gray-800">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full overflow-hidden">
                    <img src={account.avatarUrl} alt={account.name} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <CardTitle className="text-light-text">{account.name}</CardTitle>
                    <CardDescription>{account.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="max-h-[600px]">
                  <ul className="divide-y divide-gray-800">
                    {(MOCK_TWEETS[account.handle] || []).map(tweet => (
                      <li key={tweet.id} className="p-4 hover:bg-gray-800/50 transition-colors">
                        <div className="flex flex-col gap-2">
                          <p className="text-light-text">{tweet.text}</p>
                          <div className="flex items-center justify-between text-xs text-gray-400">
                            <span>{formatDate(tweet.date)}</span>
                            <div className="flex items-center gap-4">
                              <span className="flex items-center gap-1">
                                <MessageSquare className="w-3 h-3" /> {tweet.retweets}
                              </span>
                              <span className="flex items-center gap-1">
                                ❤️ {tweet.likes}
                              </span>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              </CardContent>
              <CardFooter className="border-t border-gray-800 p-4">
                <a 
                  href={`https://twitter.com/${account.handle.substring(1)}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-primary flex items-center gap-1 hover:underline"
                >
                  <Twitter className="w-3 h-3" /> View full profile on Twitter
                </a>
              </CardFooter>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </DashboardLayout>
  );
};

export default SocialPage;
