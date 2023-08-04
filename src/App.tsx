import React, {useState, useRef} from 'react';
import './App.css'
import { BskyAgent } from '@atproto/api'

function App() {
	const [suggestionBox, setSuggestionBox] = useState({} as {
		[key : string] : number,
	});

	const [ username, setUsername ] = useState('');
	const [ password, setPassword ] = useState('');

	const [submitted, setSubmitted ] = useState(false);

	const [loginError, setLoginError] = useState(false);
	const peopleDataRef = useRef({} as {
		[key : string] : {displayName : string | undefined,
		avatar : string | undefined, handle : string, did : string}
	});
	const agent = new BskyAgent({
		service: 'https://bsky.social',

	})
	
	const onSubmit = (event : React.FormEvent) => {
		event.preventDefault();
		getFollowingFollowing(agent, username.replace('@', ''));
	}

	const getFollowing = async (actor : string) => {
		let cursor;
		let following : {handle : string, displayName : string | undefined, avatar : string | undefined, did : string}[] = [];
		do {
			const result = await agent.getFollows({
				actor: actor,
				cursor: cursor,
			});
			cursor = result.data.cursor;
			const addOn = result.data.follows.map(el => {
				const returnValue = {handle: '', avatar: '' as string | undefined, displayName: '' as string | undefined, did: ''};
				returnValue.handle = el.handle;
				returnValue.avatar = el.avatar;
				returnValue.displayName = el.displayName || el.handle;
				returnValue.did = el.did;
				return returnValue;
			});
			following = following.concat(addOn);

		} while (cursor);
		return following;
	}

	const getFollowingFollowing = async (agent : BskyAgent, actor : string) => {
		setLoginError(false);
		if (!username || !password) {
			return;	
		}
		setSubmitted(true);
		try {
			await agent.login({
				identifier: username.replace('@', ''),
				password: password,
			});
		}
		catch(error) {
			setLoginError(true);
			setSubmitted(false);
			return;
		}
		const following = await getFollowing(actor);
		let followersFollowing : { [key : string] : number } = {};
		following.forEach(async (el) => {
			const actorFollowing = await getFollowing(el.handle);
			actorFollowing.forEach(person => {
				if (!following.map(el => el.handle).includes(person.handle) && person.handle !== actor) {
					if (followersFollowing[person.handle]) {
						followersFollowing[person.handle]++;
					}
					else {
						followersFollowing[person.handle] = 1;
					}
					const newSuggestionBox = { ...followersFollowing };
					setSuggestionBox(newSuggestionBox);
					if (!peopleDataRef.current[person.handle]) {
						peopleDataRef.current[person.handle] = person;
					}
				}
			});
		});
	}
return (
    <div className="app">
		<header>
			<h1>Lemon Tree</h1>
			<p>Find your friends on BlueSky</p>
		</header>
		{submitted ? <div>{Object.keys(suggestionBox).length === 0 ? <p>Fetching data ...</p> : Object.keys(suggestionBox).sort((a, b) => {
			if (suggestionBox[a] < suggestionBox[b]) {
				return 1;
			}
			if (suggestionBox[a] > suggestionBox[b]) {
				return -1;
			}
			return 0;
		}).slice(0, 100).map(el => <article className="person" key={el}>
			{peopleDataRef.current[el].avatar ? <p className="avatar"><img src={peopleDataRef.current[el].avatar} alt={peopleDataRef.current[el].displayName || ''} /></p> : <p className="avatar"></p>}
			<div className="main-part">
				<h2>{peopleDataRef.current[el].displayName || el}</h2>
				<p className="handle"><a href={`https://bsky.app/profile/${el}`} target="_blank" rel="noopener">{el}</a></p>
				<p className="followers">Followed by <strong>{suggestionBox[el]}</strong> people you follow</p>
			</div>
			<p className="follow-button"><button onClick={async (event) => {
				event.currentTarget.disabled = true;
				let newSuggestionBox = { ...suggestionBox };
				delete(newSuggestionBox[el]);
				await agent.login({
					identifier: username.replace('@', ''),
					password: password,
				});
				await agent.follow(peopleDataRef.current[el].did);
				setSuggestionBox(newSuggestionBox);
			}}>Follow</button></p>
		</article>)}</div> : <form onSubmit={onSubmit}>
			{loginError ? <p className="error">Login failed. Please try again.</p> : undefined}
			<p>Enter your username and password to display a list of people that are followed by many of the people you follow.</p>
			<p><label>BlueSky username (including .bsky.social or whatever)<br />
			<input type="text" name="username" value={username} onChange={(event) => setUsername(event.target.value)} /></label></p>
			<p><label>App password (please <a href="https://bsky.app/settings/app-passwords" target="_blank" rel="noopener">get one here</a> instead of trusting me with your <em>actual</em> BlueSky password!):<br />
			<input type="password" name="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label></p>
			<p><button>Find my friends!</button></p>
			<p className="credits">Created by <a href="https://bsky.app/profile/olafmoriarty.bsky.social">@olafmoriarty</a> | <a href="https://github.com/olafmoriarty/lemon-tree" target="_blank" rel="noopener">View source on GitHub</a></p>
		</form>}
    </div>
  )
}

export default App
