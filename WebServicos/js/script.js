document.addEventListener('DOMContentLoaded', () => {
  const header = document.querySelector('.site-header');
  const navToggle = document.querySelector('.nav-toggle');
  const navMenu = document.querySelector('.nav-menu');
  const revealItems = document.querySelectorAll('.reveal');
  const filterButtons = document.querySelectorAll('.filter-button');
  const contactForm = document.getElementById('contactForm');
  const carousel = document.querySelector('[data-carousel]');

  document.querySelectorAll('.page-hero').forEach((hero) => {
    if (hero.querySelector('.page-hero-media')) {
      return;
    }

    const scriptUrl = document.querySelector('script[src*="script.js"]')?.src || window.location.href;
    const heroSlides = ['contacto.jpg', 'feliz.jpg', 'nossosServicos.jpg', 'todosfelizes.jpg'].map((image) =>
      new URL(`../images/Geral/carrocel/${image}`, scriptUrl).href
    );

    const media = document.createElement('div');
    media.className = 'page-hero-media';

    heroSlides.forEach((src, index) => {
      const img = document.createElement('img');
      img.src = src;
      img.alt = '';
      img.setAttribute('aria-hidden', 'true');
      if (index === 0) {
        img.classList.add('is-active');
      }
      media.appendChild(img);
    });

    hero.appendChild(media);

    const slides = Array.from(media.querySelectorAll('img'));
    let activeIndex = 0;

    const showHeroSlide = (index) => {
      activeIndex = (index + slides.length) % slides.length;
      slides.forEach((slide, i) => {
        slide.classList.toggle('is-active', i === activeIndex);
      });
    };

    setInterval(() => showHeroSlide(activeIndex + 1), 5000);
  });

  if (carousel) {
    const slides = Array.from(carousel.querySelectorAll('.slide'));
    const dots = Array.from(carousel.querySelectorAll('.dot'));
    const prevButton = carousel.querySelector('.prev');
    const nextButton = carousel.querySelector('.next');

    if (slides.length > 0) {
      let activeIndex = 0;

      const showSlide = (index) => {
        activeIndex = (index + slides.length) % slides.length;

        slides.forEach((slide, i) => {
          const isActive = i === activeIndex;
          slide.classList.toggle('is-active', isActive);
          slide.style.display = isActive ? 'block' : 'none';
          slide.style.opacity = isActive ? '1' : '0';
        });

        dots.forEach((dot, i) => {
          dot.classList.toggle('is-active', i === activeIndex);
        });
      };

      prevButton?.addEventListener('click', () => showSlide(activeIndex - 1));
      nextButton?.addEventListener('click', () => showSlide(activeIndex + 1));

      dots.forEach((dot) => {
        dot.addEventListener('click', () => showSlide(Number(dot.dataset.slide)));
      });

      showSlide(0);
      setInterval(() => showSlide(activeIndex + 1), 4500);
    }
  }

  if (header) {
    const handleHeader = () => {
      header.classList.toggle('scrolled', window.scrollY > 12);
    };

    handleHeader();
    window.addEventListener('scroll', handleHeader, { passive: true });
  }

  if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => {
      const isOpen = navMenu.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', String(isOpen));
    });

    navMenu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  revealItems.forEach((item) => observer.observe(item));

  filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const filter = button.dataset.filter;
      filterButtons.forEach((item) => item.classList.toggle('is-active', item === button));

      document.querySelectorAll('.project-card').forEach((card) => {
        const matches = filter === 'all' || card.dataset.category === filter;
        card.classList.toggle('hidden', !matches);
      });
    });
  });

  if (contactForm) {
    contactForm.addEventListener('submit', (event) => {
      event.preventDefault();

      const formData = new FormData(contactForm);
      const nome = (formData.get('nome') || '').toString().trim();
      const telefone = (formData.get('telefone') || '').toString().trim();
      const email = (formData.get('email') || '').toString().trim();
      const mensagem = (formData.get('mensagem') || '').toString().trim();
      const canalEnvio = (formData.get('canal-envio') || 'email').toString();

      if (!nome || !telefone || !email || !mensagem) {
        alert('Preencha todos os campos obrigatórios antes de enviar.');
        return;
      }

      const service = (formData.get('servico') || 'Website profissional').toString();
      const subject = encodeURIComponent(`Pedido de orçamento - ${service}`);
      const body = encodeURIComponent(
        `Olá,\n\nGostaria de saber mais sobre os serviços da Spider Sky.\n\nNome: ${nome}\nEmpresa: ${formData.get('empresa') || 'Não informada'}\nTelefone: ${telefone}\nEmail: ${email}\nServiço: ${service}\nMensagem: ${mensagem}`
      );

      if (canalEnvio === 'whatsapp') {
        const whatsappMessage = encodeURIComponent(
          `Olá, gostaria de saber mais sobre os serviços da Spider Sky.\n\nNome: ${nome}\nEmpresa: ${formData.get('empresa') || 'Não informada'}\nTelefone: ${telefone}\nEmail: ${email}\nServiço: ${service}\nMensagem: ${mensagem}`
        );
        window.open(`https://wa.me/244958778696?text=${whatsappMessage}`, '_blank', 'noopener,noreferrer');
        return;
      }

      window.location.href = `mailto:leandromoba@yahoo.com?subject=${subject}&body=${body}`;
    });
  }

  const year = document.getElementById('year');
  if (year) {
    year.textContent = new Date().getFullYear();
  }
});
