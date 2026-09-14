export type SnippetTiming = "Immediate" | "Morning Gap" | "In Advance";

export interface SnippetVariant {
  timing: SnippetTiming;
  body: string;
}

export interface Snippet {
  name: string;
  variants: SnippetVariant[];
}

export interface SnippetCategory {
  category: "BIZ" | "RLT" | "REG";
  categoryLabel: string;
  icon: string;
  snippets: Snippet[];
}

export const SMS_SNIPPETS: SnippetCategory[] = [
  {
    category: "BIZ",
    categoryLabel: "Business Gifting",
    icon: "💼",
    snippets: [
      {
        name: "The Coffee & Catch-Up",
        variants: [
          {
            timing: "Immediate",
            body: `Hey {{contact.first_name}}, it's {{custom_values.rep_first_name}}, your knife rep! I just wrapped up a meeting right around the corner from your office. I'm grabbing coffees and thought I'd drop one off for you. Do you have 5 mins right now for a quick hello and to see how the team liked their gifts?`,
          },
          {
            timing: "Morning Gap",
            body: `Hey {{contact.first_name}}, it's {{custom_values.rep_first_name}}, your knife rep! I'm mapping out my route for the morning and realized I have a gap right near your office around [Time]. Going to grab some coffees—want me to drop one off for you and do a quick 5-min hello to see how the team liked their gifts?`,
          },
          {
            timing: "In Advance",
            body: `Hey {{contact.first_name}}, it's {{custom_values.rep_first_name}}, your knife rep! I'll be in your neck of the woods on [Day] meeting with a few other owners. I'd love to bring you a coffee and do a quick 5-min hello to see how the team loved their gifts. Does morning or afternoon work best?`,
          },
        ],
      },
      {
        name: "The Artifact Drop (Catalog)",
        variants: [
          {
            timing: "Immediate",
            body: `Hey {{contact.first_name}}, it's {{custom_values.rep_first_name}}, your knife rep! I just wrapped up a meeting right around the corner from your office. I'm grabbing coffees and thought I'd drop one off for you. Do you have 5 mins right now for a quick hello and to see how the team liked their gifts?`,
          },
          {
            timing: "Morning Gap",
            body: `Hi {{contact.first_name}}! {{custom_values.rep_first_name}} here, from your corporate-gifting team. I'm heading to your side of town this morning to do some 'Surprise and Delight' drop-ins for my top clients. Will you be at the HQ around [Time]? I have a physical copy of our new 2026 Gifting Catalog I want to drop on your desk before Q4 sneaks up on us. 👀`,
          },
          {
            timing: "In Advance",
            body: `Hi {{contact.first_name}}! {{custom_values.rep_first_name}} here, from your corporate-gifting team. I'm doing some 'Surprise and Delight' drop-ins for my top clients in your area next [Day]. Are you going to be at the office? I want to make sure I drop a physical copy of our new 2026 Gifting Catalog on your desk before the Q4 rush hits. Let me know!`,
          },
        ],
      },
    ],
  },
  {
    category: "RLT",
    categoryLabel: "Realtor / Lender",
    icon: "🏠",
    snippets: [
      {
        name: "The Top-Down Coffee Drop",
        variants: [
          {
            timing: "Immediate",
            body: `Hey {{contact.first_name}}, it's {{custom_values.rep_first_name}}, your knife rep! I just wrapped up a meeting right around the corner from the brokerage. I'm grabbing coffees and thought I'd drop one off for you and the front desk. Got 5 mins right now for a quick hello? ☕🔪`,
          },
          {
            timing: "Morning Gap",
            body: `Hey {{contact.first_name}}, it's {{custom_values.rep_first_name}}, your knife rep! I'm doing a sweep of the brokerages in your area this morning. I'm grabbing coffees and thought I'd drop one off for you and the front desk around [Time]. Got 5 mins for a quick hello? ☕🔪`,
          },
          {
            timing: "In Advance",
            body: `Hey {{contact.first_name}}, it's {{custom_values.rep_first_name}}, your knife rep! I'm planning to swing by a few brokerages in your area next [Day] with some coffees for the front desk. I'd love to pop in for 5 mins to say hello and make sure your agents are fully locked and loaded for closing gifts this quarter. Does morning or afternoon work better?`,
          },
        ],
      },
      {
        name: "The Show and Tell",
        variants: [
          {
            timing: "Immediate",
            body: `Hi {{contact.first_name}}! I'm in your immediate area for the next 20 minutes dropping off some closing gifts to another agent. Just wanted to see if you're at the office? I've got something for you and I would love to give it to you in person.`,
          },
          {
            timing: "Morning Gap",
            body: `Hi {{contact.first_name}}! It's {{custom_values.rep_first_name}}, your knife rep. I'm loading up the trunk with closing gifts for a few agents in your area this morning. Are you going to be at the office around [Time]? I've got something for you and I would love to give it to you in person.`,
          },
          {
            timing: "In Advance",
            body: `Hi {{contact.first_name}}! It's {{custom_values.rep_first_name}}, your knife rep. I'll be in your immediate area next [Day] dropping off closing gifts to a few agents. I've got something set aside for you and would love to drop it off in person. Are you going to be around the office?`,
          },
        ],
      },
    ],
  },
  {
    category: "REG",
    categoryLabel: "Neighborhood Stop-Ins",
    icon: "🔪",
    snippets: [
      {
        name: "The Forever Guarantee Audit",
        variants: [
          {
            timing: "Immediate",
            body: `Hi {{contact.first_name}}! It's {{custom_values.rep_first_name}}, your knife rep. My last appointment finished early, and I'm sitting right in your neighborhood! Are you home? I have exactly 20 minutes to swing by, touch up your straight edges, and do a quick 'Forever Guarantee' audit to see if any of your Double-D® blades need to take a trip back to Olean for factory refurbishing. Let me know right away so I can pull into your driveway! 🔪`,
          },
          {
            timing: "Morning Gap",
            body: `Hi {{contact.first_name}}! It's {{custom_values.rep_first_name}}, your knife rep. I had an early appointment reschedule, so I have a quick 20-minute gap right in your neighborhood around [Time]! Do you want me to swing by, touch up your straight edges, and do a quick 'Forever Guarantee' audit to see if any of your Double-D® blades need to take a trip back to Olean for factory refurbishing? Let me know! 🔪`,
          },
          {
            timing: "In Advance",
            body: `Hi {{contact.first_name}}! It's {{custom_values.rep_first_name}}, your knife rep. I'll be in your neighborhood next [Day] taking care of a few of my top clients. I have one 20-minute slot left. Want me to swing by, touch up your straight edges, and do a 'Forever Guarantee' audit to see if any of your Double-D® blades need factory refurbishing? Let me know so I can get you on the route! 🔪`,
          },
        ],
      },
      {
        name: "The Unpacked Gear Audit",
        variants: [
          {
            timing: "Immediate",
            body: `Hey {{contact.first_name}}, {{custom_values.rep_first_name}}, your knife rep, here! I'm right down your street finishing up a Service Call for one of your neighbors. Since my sharpening gear is already unpacked, do you want me to pop over for 15 mins to touch up your straight edges and make sure you have the right tool for the right jobs?`,
          },
          {
            timing: "Morning Gap",
            body: `Hey {{contact.first_name}}, {{custom_values.rep_first_name}}, your knife rep, here! I'm heading to your street this morning for a Service Call with one of your neighbors. Since my sharpening gear will already be unpacked, do you want me to pop over after for 15 mins to touch up your straight edges and make sure you have the right tool for the right jobs?`,
          },
          {
            timing: "In Advance",
            body: `Hey {{contact.first_name}}, {{custom_values.rep_first_name}}, your knife rep, here! I'm going to be right down your street next [Day] doing a Service Call for a neighbor. Since my sharpening gear will be with me, do you want to grab a 15-minute slot while I'm there? I can touch up your straight edges and make sure you have the right tool for the right jobs.`,
          },
        ],
      },
    ],
  },
];
