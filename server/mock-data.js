const MOCK_USER = {
  name: 'Jane Doe',
  email: 'jane.doe@example.com',
};

const MOCK_FOLDERS_FLAT = [
  { path: 'Inbox', name: 'Inbox' },
  { path: 'Sent', name: 'Sent' },
  { path: 'Drafts', name: 'Drafts' },
  { path: 'Spam', name: 'Spam' },
  { path: 'Trash', name: 'Trash' },
  { path: 'Projects', name: 'Projects' },
  { path: 'Projects/Alpha', name: 'Alpha' },
  { path: 'Projects/Bravo', name: 'Bravo' },
  { path: 'Receipts', name: 'Receipts' },
];

const MOCK_EMAILS = {
  'Inbox': [
    {
      uid: 'inbox-1',
      threadId: 'thread-project-alpha',
      from: { name: 'Alice', email: 'alice@example.com' },
      to: [{ name: 'Jane Doe', email: 'jane.doe@example.com' }],
      subject: 'Project Update',
      date: '2024-07-30T10:00:00Z',
      snippet: 'Here is the latest update on the project. The new designs are attached.',
      body: '<h1>Project Update</h1><p>Hi Jane,</p><p>Here is the latest update on the project. The new designs are attached for your review. Please provide feedback by EOD.</p><p>Best,<br>Alice</p>',
      read: false,
      attachments: [{ filename: 'designs_v2.pdf', size: '2.5 MB', url: '#' }]
    },
    {
      uid: 'inbox-2',
      threadId: 'thread-lunch',
      from: { name: 'Bob', email: 'bob@example.com' },
      to: [{ name: 'Jane Doe', email: 'jane.doe@example.com' }],
      subject: 'Lunch on Friday?',
      date: '2024-07-30T09:30:00Z',
      snippet: 'Hey, are you free for lunch this Friday? I was thinking about that new cafe downtown.',
      body: '<p>Hey, are you free for lunch this Friday? I was thinking about that new cafe downtown.</p><p>Let me know!</p><p>-Bob</p>',
      read: false,
    },
    {
      uid: 'inbox-3',
      threadId: 'thread-newsletter',
      from: { name: 'Marketing Team', email: 'marketing@corp.com' },
      to: [{ name: 'Jane Doe', email: 'jane.doe@example.com' }],
      subject: 'Weekly Newsletter',
      date: '2024-07-29T15:00:00Z',
      snippet: 'Your weekly dose of company news and updates. See what is new this week!',
      body: '<h1>Company Newsletter</h1><p>Lots of exciting things happened this week! Check out our latest blog post.</p>',
      read: false,
    },
     {
      uid: 'inbox-4',
      threadId: 'thread-project-alpha',
      from: { name: 'Charlie', email: 'charlie@example.com' },
      to: [{ name: 'Jane Doe', email: 'jane.doe@example.com' }],
      subject: 'Re: Project Update',
      date: '2024-07-30T11:00:00Z',
      snippet: 'Thanks for sending that over. I have a quick follow-up question regarding the report.',
      body: '<p>Thanks for sending that over. I have a quick follow-up question regarding the report.</p>',
      read: false,
    },
    {
      uid: 'inbox-5',
      threadId: 'thread-project-alpha',
      from: { name: 'Jane Doe', email: 'jane.doe@example.com' },
      to: [{ name: 'Alice', email: 'alice@example.com' }, { name: 'Charlie', email: 'charlie@example.com' }],
      subject: 'Re: Project Update',
      date: '2024-07-30T14:00:00Z',
      snippet: 'Good question, Charlie. Let me clarify...',
      body: '<p>Good question, Charlie. Let me clarify. The data on page 5 refers to Q2 earnings, not Q3.</p>',
      read: true,
    },
  ],
  'Sent': [
    {
      uid: 'sent-1',
      threadId: 'thread-project-alpha',
      from: { name: 'Jane Doe', email: 'jane.doe@example.com' },
      to: [{ name: 'Alice', email: 'alice@example.com' }],
      subject: 'Re: Project Update',
      date: '2024-07-30T10:30:00Z',
      snippet: 'Thanks, Alice! The new designs look great. I will send my feedback shortly.',
      body: '<p>Thanks, Alice! The new designs look great. I will send my feedback shortly.</p>',
      read: true,
    },
  ],
  'Drafts': [
    {
      uid: 'draft-1',
      threadId: 'thread-lunch',
      from: { name: 'Jane Doe', email: 'jane.doe@example.com' },
      to: [{ name: 'Bob', email: 'bob@example.com' }],
      subject: 'Re: Lunch on Friday?',
      date: '2024-07-30T09:35:00Z',
      snippet: 'Friday sounds great! I am free around 12:30 PM...',
      body: '<p>Friday sounds great! I am free around 12:30 PM...</p>',
      read: true,
    },
  ],
  'Spam': [],
  'Trash': [],
  'Projects/Alpha': [
    {
      uid: 'alpha-1',
      threadId: 'thread-alpha-kickoff',
      from: { name: 'Project Manager', email: 'pm@example.com' },
      to: [{ name: 'Jane Doe', email: 'jane.doe@example.com' }],
      subject: '[Alpha] Project Kickoff',
      date: '2024-07-28T16:00:00Z',
      snippet: 'Hi team, the kickoff meeting for Project Alpha is scheduled for tomorrow. See the agenda attached.',
      body: '<h1>Project Alpha Kickoff</h1><p>Hi team, the kickoff meeting for Project Alpha is scheduled for tomorrow. See the agenda attached.</p>',
      read: false,
    }
  ],
  'Projects/Bravo': [],
  'Receipts': []
};

module.exports = {
    MOCK_USER,
    MOCK_FOLDERS_FLAT,
    MOCK_EMAILS
};
