import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'

import { API } from 'aws-amplify'
import {
	getUserByUsername,
	listPosts,
	listFollowingByFollowingId
} from '../graphql/queries'
import {
	createFollowing,
	deleteFollowing
} from '../graphql/mutations'

import { Post } from '../comps/base/jsx/Post'

export const User = ({ userData, id }) => {
	const { username } = useParams()

	const [ posts, setPosts ] = useState([])
	const [ { name, avatar, owner }, setUserData ] = useState({})
	
	const [ followingId, setFollowingId ] = useState(false)
	const [ followers, setFollowers ] = useState([])

	useEffect(() => {
		const fetchUser = async () => {
			try {
				const { data } = await API.graphql({
					query: getUserByUsername,
					variables: { username }
				})
				setUserData(data.getUserByUsername.items[0])
			} catch (err) {
				console.log('error fetching user data', err)
			}
		}
		fetchUser()

		const fetchPosts = async () => {
			try {
				const { data } = await API.graphql({
					query: listPosts
				})
				setPosts(
					data.listPosts.items
						.filter(post => post.owner === username)
				)
			} catch (err) {
				console.log('error fetching posts for user', err)
			}
		}
		fetchPosts()

		const fetchFollowers = async () => {
			try {
				const { data } = await API.graphql({
					query: listFollowingByFollowingId,
					variables: { followingId: username }
				})
				const valFollowers = validateFollowers(data.listFollowingByFollowingId.items)
				
				for (let i in valFollowers)
					if (valFollowers[i].owner === userData.username) {
						setFollowingId(valFollowers[i].id)
						return
					}
			} catch (err) {
				console.log('error fetching follower data', err)
			}
		}

		const validateFollowers = followers => {
			// Make sure each follow is valid by having one user for each one
			const userFollowers = {}
			followers.map(({ owner, id }) => {
				userFollowers[owner] = id
			})
			let valFollowers = []
			for (let owner in userFollowers)
				valFollowers.push({ id: userFollowers[owner], owner })
			setFollowers(valFollowers)
			return valFollowers
		}
		
		fetchFollowers()
	}, [ username ])

	const handleFollow = async () => {
		try {
			const { data } = await API.graphql({
				query: createFollowing,
				variables: { input: { followingId: username } },
				authMode: 'AMAZON_COGNITO_USER_POOLS'
			})

			setFollowers([ ...followers, data.createFollowing ])
			setFollowingId(data.createFollowing.id)
		} catch (err) {
			console.log('error following user', err)
		}
	}

	const handleUnfollow = async () => {
		try {
			await API.graphql({
				query: deleteFollowing,
				variables: { input: { id: followingId } },
				authMode: 'AMAZON_COGNITO_USER_POOLS'
			})

			setFollowers(followers.filter(id => id === followingId))
			setFollowingId(false)
		} catch (err) {
			console.log('error unfollowing user', err)
		}
	}	

	return (
		<div>
			<img
				alt={username}
				src={avatar}
				className='w-10 h-10 rounded-3xl'
			/>
			<h3 className='text-xl text-orange-400'><b>{name}</b> <i>@{username}</i> {username === userData.username && ' - You'}</h3>
			
			<p>{followers !== [] ? `${followers.length} followers` : ''}</p>
			{(userData.username !== username) && (followingId ? (
				<button
					className='bg-orange-600 hover:bg-purple-400 py-2 px-4 transition ease-in-out delay-150 duration-300 rounded-md hover:scale-110'
					onClick={handleUnfollow}
				>Unfollow</button>
			) : (
				<button
					className='bg-orange-600 hover:bg-purple-400 py-2 px-4 transition ease-in-out delay-150 duration-300 rounded-md hover:scale-110'
					onClick={handleFollow}
				>Follow</button>
			))}
			
			{posts.map(props => (
				<Post userData={userData} {...props} />
			))}
		</div>
	)
};
