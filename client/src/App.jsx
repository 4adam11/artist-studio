import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Route, Routes, useParams } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function Home({ artworks }) {
  const featured = artworks.filter((item) => item.featured);

  return (
    <>
      <section className="hero">
        <div className="hero-content">
          <p className="eyebrow">Fabric Painting • Crochet • Handcrafted Fiber Art</p>
          <h1>Every piece begins with color, texture, and patience.</h1>
          <p className="lead">
            Welcome to an artist studio where each workspace piece is shared with care and made to be discussed, collected, and loved.
          </p>
          <div className="actions">
            <Link to="/portfolio" className="btn">Explore the portfolio</Link>
            <Link to="/shop" className="btn btn-secondary">Shop originals</Link>
          </div>
        </div>
      </section>

      <section className="page">
        <div className="section-head">
          <h2>Featured works</h2>
          <Link to="/portfolio" className="text-link">See all artworks</Link>
        </div>
        <div className="grid">
          {featured.map((art) => (
            <article key={art.id} className="card">
              <img src={art.image_url || art.image} alt={art.title} />
              <div className="card-body">
                <h3>{art.title}</h3>
                <p className="tag">{art.category}</p>
                <p>{art.description}</p>
                <Link to={`/portfolio/${art.id}`} className="text-link">Read more</Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

function Portfolio({ artworks }) {
  const [filter, setFilter] = useState('All');
  const categories = ['All', ...new Set(artworks.map((item) => item.category))];
  const visible = filter === 'All' ? artworks : artworks.filter((item) => item.category === filter);

  return (
    <section className="page">
      <div className="section-head">
        <h2>Portfolio</h2>
        <div className="filter-row">
          {categories.map((cat) => (
            <button key={cat} className={`chip ${filter === cat ? 'chip-active' : ''}`} onClick={() => setFilter(cat)}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid">
        {visible.map((art) => (
          <article key={art.id} className="card">
            <img src={art.image_url || art.image} alt={art.title} />
            <div className="card-body">
              <h3>{art.title}</h3>
              <p className="tag">{art.category}</p>
              <p>{art.description}</p>
              <Link to={`/portfolio/${art.id}`} className="text-link">View details</Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ArtworkDetail({ artworks, comments, onAddComment }) {
  const { id } = useParams();
  const artwork = artworks.find((item) => String(item.id) === String(id));

  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('idle');

  if (!artwork) return <section className="page"><h2>Artwork not found</h2><Link to="/portfolio" className="text-link">Back to portfolio</Link></section>;

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus('loading');
    const result = await onAddComment(artwork.id, name, message);
    if (result) {
      setName('');
      setMessage('');
      setStatus('sent');
    } else {
      setStatus('error');
    }
  }

  return (
    <section className="page detail-layout">
      <img src={artwork.image_url || artwork.image} alt={artwork.title} className="detail-image" />
      <div>
        <p className="eyebrow">{artwork.category}</p>
        <h2>{artwork.title}</h2>
        <p>{artwork.description}</p>
        <p>{artwork.story || 'This piece carries layers of texture, memory, and studio process.'}</p>

        <div className="panel">
          <h3>Discuss this piece</h3>
          <form onSubmit={handleSubmit} className="form-card">
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" required />
            <textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Ask a question or share your thoughts" required />
            <button type="submit" className="btn">Post comment</button>
          </form>
          {status === 'error' && <p className="error-text">Please share both your name and a message.</p>}
          {status === 'sent' && <p className="success-text">Thanks for joining the conversation.</p>}

          <div className="comments">
            {comments[artwork.id]?.length ? comments[artwork.id].map((comment) => (
              <div key={comment.id} className="comment-card">
                <strong>{comment.name}</strong>
                <p>{comment.message}</p>
              </div>
            )) : <p>No comments yet — be the first to start the discussion.</p>}
          </div>
        </div>
      </div>
    </section>
  );
}

function Shop({ products, addToCart }) {
  return (
    <section className="page">
      <div className="section-head">
        <h2>Shop</h2>
        <p>Original handmade pieces ready to take home.</p>
      </div>
      <div className="grid">
        {products.map((product) => (
          <article key={product.id} className="card">
            <img src={product.image_url || product.image} alt={product.title} />
            <div className="card-body">
              <h3>{product.title}</h3>
              <p className="tag">{product.category}</p>
              <p>{product.description}</p>
              <p className="price">${Number(product.price).toFixed(2)}</p>
              <button className="btn" onClick={() => addToCart(product)}>Add to cart</button>
              <Link to={`/shop/${product.id}`} className="text-link">View product</Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ProductDetail({ products, addToCart }) {
  const { id } = useParams();
  const product = products.find((item) => String(item.id) === String(id));

  if (!product) return <section className="page"><h2>Product not found</h2><Link to="/shop" className="text-link">Back to shop</Link></section>;

  return (
    <section className="page detail-layout">
      <img src={product.image_url || product.image} alt={product.title} className="detail-image" />
      <div>
        <p className="eyebrow">{product.category}</p>
        <h2>{product.title}</h2>
        <p>{product.description}</p>
        <p className="price">${Number(product.price).toFixed(2)}</p>
        <button className="btn" onClick={() => addToCart(product)}>Add to cart</button>
      </div>
    </section>
  );
}

function Cart({ cart, updateQuantity, removeItem, totalPrice }) {
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (!cart.length) {
    return <section className="page"><h2>Your cart is empty</h2><p>Pick a favorite piece from the shop and it will appear here.</p></section>;
  }

  return (
    <section className="page">
      <h2>Your cart</h2>
      <p>{totalItems} item(s) selected</p>
      {cart.map((item) => (
        <div key={item.id} className="cart-row">
          <strong>{item.title}</strong>
          <span>${Number(item.price).toFixed(2)}</span>
          <input type="number" min="1" value={item.quantity} onChange={(event) => updateQuantity(item.id, Number(event.target.value))} />
          <button className="chip" onClick={() => removeItem(item.id)}>Remove</button>
        </div>
      ))}
      <div className="cart-summary">
        <strong>Total: ${totalPrice.toFixed(2)}</strong>
        <button className="btn">Checkout</button>
      </div>
    </section>
  );
}

function About() {
  return (
    <section className="page">
      <h2>About the studio</h2>
      <p>This studio celebrates slow craftsmanship through fabric painting, crochet, and rich textures shaped by hand and heart.</p>
    </section>
  );
}

function Contact({ onSubmitContact }) {
  const [sent, setSent] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const payload = {
      name: data.get('name'),
      email: data.get('email'),
      message: data.get('message')
    };
    const result = await onSubmitContact(payload);
    if (result) setSent(true);
  }

  return (
    <section className="page">
      <h2>Contact</h2>
      <p>For commissions, collaborations, or questions, send a note here.</p>
      {sent ? <p className="success-text">Thank you — your message has been received.</p> : (
        <form className="form-card" onSubmit={handleSubmit}>
          <input name="name" placeholder="Your name" required />
          <input name="email" type="email" placeholder="Your email" required />
          <textarea name="message" placeholder="What would you like to discuss?" required />
          <button className="btn" type="submit">Send</button>
        </form>
      )}
    </section>
  );
}

function NotFound() {
  return <section className="page"><h2>Page not found</h2><p>The page you are looking for does not exist.</p></section>;
}

export default function App() {
  const [artworks, setArtworks] = useState([]);
  const [products, setProducts] = useState([]);
  const [comments, setComments] = useState({});
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [artworkRes, productRes] = await Promise.all([
          fetch(`${API_URL}/artworks`),
          fetch(`${API_URL}/products`)
        ]);

        const artworkData = await artworkRes.json();
        const productData = await productRes.json();
        setArtworks(artworkData);
        setProducts(productData);

        const commentMap = {};
        for (const artwork of artworkData) {
          const res = await fetch(`${API_URL}/artworks/${artwork.id}/comments`);
          if (res.ok) {
            commentMap[artwork.id] = await res.json();
          }
        }
        setComments(commentMap);
      } catch {
        setArtworks([
          { id: 1, title: 'Golden Bloom Wall Hanging', category: 'Fabric Painting', image: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=900&q=80', description: 'A vibrant hand-painted cotton piece inspired by marigold fields.', featured: true, story: 'Painted in layers of warm color and stitched detail.' },
          { id: 2, title: 'Ocean Crochet Throw', category: 'Crochet', image: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=900&q=80', description: 'A cozy layered blanket made with soft blue and sea-green yarns.', featured: true, story: 'A calm palette of sea tones woven into an heirloom-style blanket.' },
          { id: 3, title: 'Woven Memory Basket', category: 'Other', image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=80', description: 'A sculptural basket woven from natural fibers and dyed cord.', featured: false, story: 'A tactile piece shaped around gathered textures and rhythm.' }
        ]);
        setProducts([
          { id: 1, title: 'Mini Fabric Study', category: 'Fabric Painting', image: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=900&q=80', description: 'A small handmade print for a gallery wall.', price: 28 },
          { id: 2, title: 'Crochet Pocket Pouch', category: 'Crochet', image: 'https://images.unsplash.com/photo-1487412912498-0447578fcca8?auto=format&fit=crop&w=900&q=80', description: 'A soft pouch for everyday essentials.', price: 24 }
        ]);
        setComments({});
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) return prev.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (id, quantity) => {
    setCart((prev) => prev.map((item) => item.id === id ? { ...item, quantity: quantity > 0 ? quantity : 1 } : item).filter((item) => item.quantity > 0));
  };

  const removeItem = (id) => setCart((prev) => prev.filter((item) => item.id !== id));

  const totalPrice = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);

  const handleAddComment = async (artworkId, name, message) => {
    try {
      const response = await fetch(`${API_URL}/artworks/${artworkId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, message })
      });
      if (!response.ok) return false;
      const comment = await response.json();
      setComments((prev) => ({ ...prev, [artworkId]: [...(prev[artworkId] || []), comment] }));
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmitContact = async (payload) => {
    try {
      const response = await fetch(`${API_URL}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return response.ok;
    } catch {
      return false;
    }
  };

  return (
    <div className="app-shell">
      <nav className="nav">
        <NavLink to="/">Home</NavLink>
        <NavLink to="/portfolio">Portfolio</NavLink>
        <NavLink to="/shop">Shop</NavLink>
        <NavLink to="/about">About</NavLink>
        <NavLink to="/contact">Contact</NavLink>
        <NavLink to="/cart">Cart ({cart.reduce((sum, item) => sum + item.quantity, 0)})</NavLink>
      </nav>

      {loading ? <section className="page"><p>Loading your studio experience...</p></section> : (
        <Routes>
          <Route path="/" element={<Home artworks={artworks} />} />
          <Route path="/portfolio" element={<Portfolio artworks={artworks} />} />
          <Route path="/portfolio/:id" element={<ArtworkDetail artworks={artworks} comments={comments} onAddComment={handleAddComment} />} />
          <Route path="/shop" element={<Shop products={products} addToCart={addToCart} />} />
          <Route path="/shop/:id" element={<ProductDetail products={products} addToCart={addToCart} />} />
          <Route path="/cart" element={<Cart cart={cart} updateQuantity={updateQuantity} removeItem={removeItem} totalPrice={totalPrice} />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact onSubmitContact={handleSubmitContact} />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      )}
    </div>
  );
}
