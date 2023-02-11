const express = require('express')
const app = express()
const port = 3000;
const { buildSchema } = require('graphql');
const { graphqlHTTP } = require('express-graphql');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken')
const User  = require('./models/User');
const Post = require('./models/Post');
const Comment = require ('./models/Comment');
require('./connection');
const secret =  'mysecret'


/// lab //////
// update post
// delete post 
// get one post 
// post commments : crud operation 
// on getting post : comments

const schema = buildSchema(`
	type Post {
		title:String!
		content:String!
		user:User,
		comments: [comments]
	}
	type User {
		name:String!
		email:String!
		posts:[Post]
	}

	type Comment {
		content:String!
		userId:User
		postId:Post
	}

	input UserInput {
		name:String!
		email:String!
		password:String!
	}
	type Query {
		test:String
		usersGetAll:[User!]!
		userGetOne(id:ID!):User!
		getMyPosts(token:String!):[Post!]!
		getOnePost(token:String!,postId:ID!):Post!
    	getComment(token:String!,postId:ID!,commentId:ID!):comment
    	getAllComments(token:String!,postId:ID!):[comment!]
	}
	type Mutation {
		userCreate(input:UserInput):User
		userLogin(email:String!,password:String!):String
		postCreate(title:String!,content:String!,token:String!):String
		postUpdate(title:String!,content:String!,token:String!, _id: ID):Post
		postDelete(token: String!, _id: ID):String
		postGetOne(token:String, _id:ID!):Post!
		commentCreate(token:String!,postId:ID!,content:String!):String
    	commentUpdate( token:String!, postId:ID!, commentId:ID!,content:String!):String
    	commentDelete(token:String!, postId:ID!, commentId:ID!):String
	}
`)
const userQueries = {
	test:async()=>{
		const user = await User.find().populate('posts');
		console.log(JSON.stringify(user,null,2))
		return 'test'
	},
	usersGetAll:async()=>{
		const users = await User.find();
		return users;
	},
	userGetOne:async ({id})=>{
		const user = await User.findById(id).populate('posts');
		console.log("🚀 ~ file: server.js:55 ~ userGetOne: ~ user", user)
		return user;
	}
}
const userMutations = {
	userCreate: async ({input})=>{
		const { name, email, password } = input;
		const hashedPassword = await bcrypt.hash(password, 10);
		const UserCreated = new User({ name, email, password:hashedPassword });
		console.log(hashedPassword);
		await UserCreated.save();
		return {
			name,
			email
		}
	},
	userLogin: async ({email,password})=>{
		const user = await User.findOne({email});
		const isValidPassword =   await bcrypt.compare(password, user?.password);
		if (!user|| !isValidPassword) throw new Error('Invalid credentials');
		console.log('user',user);
		const token = jwt.sign({userId:user._id},secret)
		return token
	}
}

const auth = async (token)=>{
	const {userId} = jwt.verify(token,secret);
	const user = await User.findById(userId);
	return user;
}
const postQueries = {
	getMyPosts: async ({token})=>{
		const user = await auth(token);
		const posts = await Post.find({userId:user._id}).populate('userId');
		debugger;
		console.log('posts',posts)
		return posts.map(post=>({...post._doc,user:post.userId}));
	},
	postGetOne:async ({token ,_id})=>{
		const user= await auth(token);
		const post = await Post.findById(_id);
		console.log("🚀 ~ file: server.js:55 ~ postGetOne: ~ post", post);
		return post;
	}
}
const postMutations = {
	postCreate: async({title,content,token})=>{
		const user = await auth(token);
		const post = new Post({title,content,userId:user._id});
		console.log('user',user)
		await post.save();
		return 'post created'
	}, 
	postUpdate: async({title,content,token, _id})=> {
		const user = await auth(token);
		const updatedPost= await Post.findByIdAndUpdate(_id, {title, content});

		return updatedPost;
	},
	postDelete: async({token, _id})=> {
		const user= await auth(token);
		const deletedPost= await Post.findByIdAndDelete(_id);

		return "post deleted successfully";
	}
}

const commentQueries = {
	commentGetOne: async ({ token, postId, commentId }) => {
	  const user = await auth(token);
	  const comment = await Comment.findOne({
		userId: user.id,
		postId,
		_id: commentId,
	  }).populate("postId userId");
	  if (!comment) {
		return "not found";
	  }
	  return comment;
	},
	commentGetAll: async ({ token, postId }) => {
	  const user = await auth(token);
	  const comments = await Comment.find({
		userId: user.id,
		postId,
	  }).populate("postId userId");
	  return comments;
	},
  };

const commentMutations = {
	commentCreate: async ({ token, postId ,content }) => {
	  const user = await auth(token);
	  await Comment.create({
		content,
		postId,
		userId: user.id
	  });
	  return "comment created";
	},
	commetUpdate: async ({ token, postId, commentID, content}) => {
		const user = await auth(token);
		const comment = await Comment.findOneAndUpdate(
			{
				userId: user.id,
        postId,
        _id: commentId,
			},
			{ content: content}
		)
		if (!comment) {
			return "not found";
		  }
		  return "comment updated successfully";
	},
	commentDelete: async ({ token, postId, commentId }) => {
		const user = await auth(token);
		const comment = await Comment.findOneAndDelete({
		  userId: user.id,
		  postId,
		  _id: commentId,
		});
		if (!comment) {
		  return "not found";
		}
		return "comment deleted successfully";
	  },
	};

const resolvers = {
	...userQueries,
	...userMutations,
	...postQueries,
	...postMutations,
	...commentMutations,
	...commentQueries
}
app.use('/graphql', graphqlHTTP({ schema, rootValue: resolvers, graphiql: true }))

app.listen(port, () => {
	console.log(`Example app listening on port ${port}`)
})