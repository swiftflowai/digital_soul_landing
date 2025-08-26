import { Star, Quote } from 'lucide-react';

const Testimonials = () => {
  const testimonials = [
    {
      role: "Preserving grandmother's stories",
      content: "I created a Digital Soul for my grandmother before she passed. Now my children can still hear her bedtime stories and learn about our family history. It's like she's still with us.",
      rating: 5,
      avatar: "https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop"
    },
    {
      role: "Military veteran sharing his journey",
      content: "After three tours overseas, I wanted to share my experiences with my family in a meaningful way. My Digital Soul helps me process memories while creating something valuable for my kids.",
      rating: 5,
      avatar: "https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop"
    },
    {
      role: "Creating a family legacy",
      content: "Our family has been using Digital Soul to preserve four generations of stories. It's incredible how AI captures not just the words, but the essence of each person's personality.",
      rating: 5,
      avatar: "https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop"
    }
  ];

  return (
    <section id="testimonials" className="py-20 bg-gradient-to-br from-purple-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Stories of Connection
          </h2>
          <p className="max-w-2xl mx-auto text-xl text-gray-600">
            Real families sharing how Digital Soul has helped them preserve 
            and connect with their most precious memories
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="flex items-center mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                ))}
              </div>
              
              <div className="relative mb-6">
                <Quote className="absolute -top-2 -left-2 w-8 h-8 text-purple-200" />
                <p className="text-gray-700 leading-relaxed italic pl-6">
                  "{testimonial.content}"
                </p>
              </div>

              <div className="flex items-center space-x-4">
                <img
                  src={testimonial.avatar}
                  alt="User testimonial"
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div>
                  <p className="text-sm text-gray-600 font-medium">{testimonial.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-16">
          <div className="inline-flex items-center space-x-2 bg-white/80 backdrop-blur-sm rounded-full px-6 py-3 shadow-lg">
            <span className="text-sm font-medium text-gray-700">Join thousands preserving their legacy</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;