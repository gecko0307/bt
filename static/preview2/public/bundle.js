var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function to_number(value) {
        return value === '' ? null : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        if (value === null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
    }
    function select_option(select, value) {
        for (let i = 0; i < select.options.length; i += 1) {
            const option = select.options[i];
            if (option.__value === value) {
                option.selected = true;
                return;
            }
        }
        select.selectedIndex = -1; // no option should be selected
    }
    function select_value(select) {
        const selected_option = select.querySelector(':checked') || select.options[0];
        return selected_option && selected_option.__value;
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.47.0' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\Tabs.svelte generated by Svelte v3.47.0 */
    const file$5 = "src\\Tabs.svelte";

    function create_fragment$5(ctx) {
    	let main;
    	let div4;
    	let div0;
    	let t1;
    	let div1;
    	let t3;
    	let div2;
    	let t5;
    	let div3;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			main = element("main");
    			div4 = element("div");
    			div0 = element("div");
    			div0.textContent = "🛠️";
    			t1 = space();
    			div1 = element("div");
    			div1.textContent = "📷";
    			t3 = space();
    			div2 = element("div");
    			div2.textContent = "📦";
    			t5 = space();
    			div3 = element("div");
    			div3.textContent = "📡";
    			attr_dev(div0, "class", "tab svelte-1thg375");
    			attr_dev(div0, "data-name", "tools");
    			attr_dev(div0, "title", "Tools");
    			toggle_class(div0, "active", /*currentTab*/ ctx[0] === 'tools');
    			add_location(div0, file$5, 16, 2, 336);
    			attr_dev(div1, "class", "tab svelte-1thg375");
    			attr_dev(div1, "data-name", "capturer");
    			attr_dev(div1, "title", "Capturer");
    			toggle_class(div1, "active", /*currentTab*/ ctx[0] === 'capturer');
    			add_location(div1, file$5, 17, 2, 458);
    			attr_dev(div2, "class", "tab svelte-1thg375");
    			attr_dev(div2, "data-name", "builder");
    			attr_dev(div2, "title", "Builder");
    			toggle_class(div2, "active", /*currentTab*/ ctx[0] === 'builder');
    			add_location(div2, file$5, 18, 2, 588);
    			attr_dev(div3, "class", "tab svelte-1thg375");
    			attr_dev(div3, "data-name", "events");
    			attr_dev(div3, "title", "Events & messages");
    			toggle_class(div3, "active", /*currentTab*/ ctx[0] === 'events');
    			add_location(div3, file$5, 19, 2, 715);
    			attr_dev(div4, "class", "tabs svelte-1thg375");
    			add_location(div4, file$5, 15, 1, 314);
    			attr_dev(main, "class", "svelte-1thg375");
    			add_location(main, file$5, 14, 0, 305);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div4);
    			append_dev(div4, div0);
    			append_dev(div4, t1);
    			append_dev(div4, div1);
    			append_dev(div4, t3);
    			append_dev(div4, div2);
    			append_dev(div4, t5);
    			append_dev(div4, div3);

    			if (!mounted) {
    				dispose = [
    					listen_dev(div0, "click", /*tabClick*/ ctx[1], false, false, false),
    					listen_dev(div1, "click", /*tabClick*/ ctx[1], false, false, false),
    					listen_dev(div2, "click", /*tabClick*/ ctx[1], false, false, false),
    					listen_dev(div3, "click", /*tabClick*/ ctx[1], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*currentTab*/ 1) {
    				toggle_class(div0, "active", /*currentTab*/ ctx[0] === 'tools');
    			}

    			if (dirty & /*currentTab*/ 1) {
    				toggle_class(div1, "active", /*currentTab*/ ctx[0] === 'capturer');
    			}

    			if (dirty & /*currentTab*/ 1) {
    				toggle_class(div2, "active", /*currentTab*/ ctx[0] === 'builder');
    			}

    			if (dirty & /*currentTab*/ 1) {
    				toggle_class(div3, "active", /*currentTab*/ ctx[0] === 'events');
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Tabs', slots, []);
    	const dispatch = createEventDispatcher();
    	let currentTab = "tools";

    	function tabClick(event) {
    		const tabName = this.getAttribute("data-name");
    		$$invalidate(0, currentTab = tabName);
    		dispatch("change", { tab: currentTab });
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Tabs> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		dispatch,
    		currentTab,
    		tabClick
    	});

    	$$self.$inject_state = $$props => {
    		if ('currentTab' in $$props) $$invalidate(0, currentTab = $$props.currentTab);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [currentTab, tabClick];
    }

    class Tabs extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Tabs",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* src\Tools.svelte generated by Svelte v3.47.0 */
    const file$4 = "src\\Tools.svelte";

    function create_fragment$4(ctx) {
    	let main;
    	let div1;
    	let fieldset0;
    	let legend0;
    	let t1;
    	let div0;
    	let span0;
    	let t3;
    	let span1;
    	let t5;
    	let div2;
    	let fieldset1;
    	let legend1;
    	let t7;
    	let input0;
    	let t8;
    	let input1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			main = element("main");
    			div1 = element("div");
    			fieldset0 = element("fieldset");
    			legend0 = element("legend");
    			legend0.textContent = "Timer";
    			t1 = space();
    			div0 = element("div");
    			span0 = element("span");
    			span0.textContent = "00";
    			t3 = text(":");
    			span1 = element("span");
    			span1.textContent = "00";
    			t5 = space();
    			div2 = element("div");
    			fieldset1 = element("fieldset");
    			legend1 = element("legend");
    			legend1.textContent = "Tools";
    			t7 = space();
    			input0 = element("input");
    			t8 = space();
    			input1 = element("input");
    			add_location(legend0, file$4, 50, 3, 1110);
    			attr_dev(span0, "id", "sec");
    			add_location(span0, file$4, 51, 19, 1153);
    			attr_dev(span1, "id", "msec");
    			attr_dev(span1, "class", "svelte-3qzh4n");
    			add_location(span1, file$4, 51, 60, 1194);
    			attr_dev(div0, "id", "timer");
    			attr_dev(div0, "class", "svelte-3qzh4n");
    			add_location(div0, file$4, 51, 3, 1137);
    			add_location(fieldset0, file$4, 49, 2, 1095);
    			attr_dev(div1, "class", "section svelte-3qzh4n");
    			add_location(div1, file$4, 48, 1, 1070);
    			add_location(legend1, file$4, 56, 3, 1309);
    			attr_dev(input0, "type", "button");
    			input0.value = "🖼️ Images";
    			attr_dev(input0, "title", "Image Optimizer");
    			add_location(input0, file$4, 57, 3, 1336);
    			attr_dev(input1, "type", "button");
    			input1.value = "🗛 Fonts";
    			attr_dev(input1, "title", "Web Font Generator");
    			add_location(input1, file$4, 58, 3, 1442);
    			add_location(fieldset1, file$4, 55, 2, 1294);
    			attr_dev(div2, "class", "section svelte-3qzh4n");
    			add_location(div2, file$4, 54, 1, 1269);
    			attr_dev(main, "class", "svelte-3qzh4n");
    			add_location(main, file$4, 47, 0, 1061);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div1);
    			append_dev(div1, fieldset0);
    			append_dev(fieldset0, legend0);
    			append_dev(fieldset0, t1);
    			append_dev(fieldset0, div0);
    			append_dev(div0, span0);
    			/*span0_binding*/ ctx[0](span0);
    			append_dev(div0, t3);
    			append_dev(div0, span1);
    			/*span1_binding*/ ctx[1](span1);
    			append_dev(main, t5);
    			append_dev(main, div2);
    			append_dev(div2, fieldset1);
    			append_dev(fieldset1, legend1);
    			append_dev(fieldset1, t7);
    			append_dev(fieldset1, input0);
    			append_dev(fieldset1, t8);
    			append_dev(fieldset1, input1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "click", /*click_handler*/ ctx[2], false, false, false),
    					listen_dev(input1, "click", /*click_handler_1*/ ctx[3], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			/*span0_binding*/ ctx[0](null);
    			/*span1_binding*/ ctx[1](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    let sec;
    let msec;
    let timerId = null;
    let period = 10; // milliseconds
    let startTime = Date.now();

    function timerStart() {
    	if (timerId != null) clearInterval(timerId);
    	startTime = Date.now();

    	timerId = setInterval(
    		function tick() {
    			var elapsedTime = Date.now() - startTime;
    			var time = (elapsedTime / 1000).toFixed(3);

    			if (time >= 30) {
    				time = 30;
    			}

    			if (sec && msec) {
    				var integer = Math.floor(time);
    				sec.innerHTML = pad(integer, 2);
    				var decimal = Math.floor((time % 1).toFixed(2) * 100);
    				if (decimal > 99) decimal = 99;
    				msec.innerHTML = pad(decimal, 2);
    			}
    		},
    		period
    	);
    }

    function pad(n, size) {
    	var s = String(n);

    	while (s.length < (size || 2)) {
    		s = "0" + s;
    	}

    	return s;
    }

    function openURL(url) {
    	window.location.href = url;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Tools', slots, []);
    	const dispatch = createEventDispatcher();

    	onMount(async () => {
    		timerStart();
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Tools> was created with unknown prop '${key}'`);
    	});

    	function span0_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			sec = $$value;
    		});
    	}

    	function span1_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			msec = $$value;
    		});
    	}

    	const click_handler = () => openURL("/images");
    	const click_handler_1 = () => openURL("/fonts");

    	$$self.$capture_state = () => ({
    		sec,
    		msec,
    		timerId,
    		period,
    		startTime,
    		timerStart,
    		pad,
    		onMount,
    		createEventDispatcher,
    		dispatch,
    		openURL
    	});

    	return [span0_binding, span1_binding, click_handler, click_handler_1];
    }

    class Tools extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Tools",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src\Capturer.svelte generated by Svelte v3.47.0 */
    const file$3 = "src\\Capturer.svelte";

    function create_fragment$3(ctx) {
    	let main;
    	let div0;
    	let fieldset0;
    	let legend0;
    	let t1;
    	let div1;
    	let fieldset1;
    	let legend1;

    	const block = {
    		c: function create() {
    			main = element("main");
    			div0 = element("div");
    			fieldset0 = element("fieldset");
    			legend0 = element("legend");
    			legend0.textContent = "Fallback";
    			t1 = space();
    			div1 = element("div");
    			fieldset1 = element("fieldset");
    			legend1 = element("legend");
    			legend1.textContent = "Video";
    			add_location(legend0, file$3, 9, 3, 168);
    			add_location(fieldset0, file$3, 8, 2, 153);
    			attr_dev(div0, "class", "section svelte-10z5nmq");
    			add_location(div0, file$3, 7, 1, 128);
    			add_location(legend1, file$3, 15, 3, 278);
    			add_location(fieldset1, file$3, 14, 2, 263);
    			attr_dev(div1, "class", "section svelte-10z5nmq");
    			add_location(div1, file$3, 13, 1, 238);
    			attr_dev(main, "class", "svelte-10z5nmq");
    			add_location(main, file$3, 6, 0, 119);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div0);
    			append_dev(div0, fieldset0);
    			append_dev(fieldset0, legend0);
    			append_dev(main, t1);
    			append_dev(main, div1);
    			append_dev(div1, fieldset1);
    			append_dev(fieldset1, legend1);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Capturer', slots, []);
    	const dispatch = createEventDispatcher();
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Capturer> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ createEventDispatcher, dispatch });
    	return [];
    }

    class Capturer extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Capturer",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src\Builder.svelte generated by Svelte v3.47.0 */
    const file$2 = "src\\Builder.svelte";

    function create_fragment$2(ctx) {
    	let main;
    	let div;
    	let fieldset;
    	let legend;

    	const block = {
    		c: function create() {
    			main = element("main");
    			div = element("div");
    			fieldset = element("fieldset");
    			legend = element("legend");
    			legend.textContent = "Build configuration";
    			add_location(legend, file$2, 9, 3, 168);
    			add_location(fieldset, file$2, 8, 2, 153);
    			attr_dev(div, "class", "section svelte-10z5nmq");
    			add_location(div, file$2, 7, 1, 128);
    			attr_dev(main, "class", "svelte-10z5nmq");
    			add_location(main, file$2, 6, 0, 119);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div);
    			append_dev(div, fieldset);
    			append_dev(fieldset, legend);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Builder', slots, []);
    	const dispatch = createEventDispatcher();
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Builder> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ createEventDispatcher, dispatch });
    	return [];
    }

    class Builder extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Builder",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src\Events.svelte generated by Svelte v3.47.0 */
    const file$1 = "src\\Events.svelte";

    function create_fragment$1(ctx) {
    	let main;
    	let div0;
    	let fieldset0;
    	let legend0;
    	let t1;
    	let div1;
    	let fieldset1;
    	let legend1;

    	const block = {
    		c: function create() {
    			main = element("main");
    			div0 = element("div");
    			fieldset0 = element("fieldset");
    			legend0 = element("legend");
    			legend0.textContent = "Messages";
    			t1 = space();
    			div1 = element("div");
    			fieldset1 = element("fieldset");
    			legend1 = element("legend");
    			legend1.textContent = "Callbacks";
    			add_location(legend0, file$1, 9, 3, 168);
    			add_location(fieldset0, file$1, 8, 2, 153);
    			attr_dev(div0, "class", "section svelte-10z5nmq");
    			add_location(div0, file$1, 7, 1, 128);
    			add_location(legend1, file$1, 15, 3, 278);
    			add_location(fieldset1, file$1, 14, 2, 263);
    			attr_dev(div1, "class", "section svelte-10z5nmq");
    			add_location(div1, file$1, 13, 1, 238);
    			attr_dev(main, "class", "svelte-10z5nmq");
    			add_location(main, file$1, 6, 0, 119);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div0);
    			append_dev(div0, fieldset0);
    			append_dev(fieldset0, legend0);
    			append_dev(main, t1);
    			append_dev(main, div1);
    			append_dev(div1, fieldset1);
    			append_dev(fieldset1, legend1);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Events', slots, []);
    	const dispatch = createEventDispatcher();
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Events> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ createEventDispatcher, dispatch });
    	return [];
    }

    class Events extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Events",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src\App.svelte generated by Svelte v3.47.0 */

    const { console: console_1 } = globals;
    const file = "src\\App.svelte";

    // (124:38) 
    function create_if_block_3(ctx) {
    	let events;
    	let current;
    	events = new Events({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(events.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(events, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(events.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(events.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(events, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(124:38) ",
    		ctx
    	});

    	return block;
    }

    // (122:39) 
    function create_if_block_2(ctx) {
    	let builder;
    	let current;
    	builder = new Builder({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(builder.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(builder, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(builder.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(builder.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(builder, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(122:39) ",
    		ctx
    	});

    	return block;
    }

    // (120:40) 
    function create_if_block_1(ctx) {
    	let capturer;
    	let current;
    	capturer = new Capturer({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(capturer.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(capturer, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(capturer.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(capturer.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(capturer, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(120:40) ",
    		ctx
    	});

    	return block;
    }

    // (118:4) {#if currentTab === "tools"}
    function create_if_block(ctx) {
    	let tools;
    	let current;
    	tools = new Tools({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(tools.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(tools, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(tools.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(tools.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(tools, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(118:4) {#if currentTab === \\\"tools\\\"}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main;
    	let div11;
    	let div1;
    	let tabs;
    	let t0;
    	let div0;
    	let current_block_type_index;
    	let if_block;
    	let t1;
    	let div10;
    	let div3;
    	let div2;
    	let iframe;
    	let iframe_src_value;
    	let t2;
    	let div9;
    	let div8;
    	let div4;
    	let p0;
    	let t4;
    	let input0;
    	let t5;
    	let input1;
    	let t6;
    	let div5;
    	let p1;
    	let t8;
    	let input2;
    	let t9;
    	let div6;
    	let p2;
    	let t11;
    	let input3;
    	let t12;
    	let div7;
    	let p3;
    	let t14;
    	let select;
    	let option0;
    	let option1;
    	let option2;
    	let t18;
    	let input4;
    	let current;
    	let mounted;
    	let dispose;
    	tabs = new Tabs({ $$inline: true });
    	tabs.$on("change", /*tabChange*/ ctx[12]);
    	const if_block_creators = [create_if_block, create_if_block_1, create_if_block_2, create_if_block_3];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*currentTab*/ ctx[6] === "tools") return 0;
    		if (/*currentTab*/ ctx[6] === "capturer") return 1;
    		if (/*currentTab*/ ctx[6] === "builder") return 2;
    		if (/*currentTab*/ ctx[6] === "events") return 3;
    		return -1;
    	}

    	if (~(current_block_type_index = select_block_type(ctx))) {
    		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	}

    	const block = {
    		c: function create() {
    			main = element("main");
    			div11 = element("div");
    			div1 = element("div");
    			create_component(tabs.$$.fragment);
    			t0 = space();
    			div0 = element("div");
    			if (if_block) if_block.c();
    			t1 = space();
    			div10 = element("div");
    			div3 = element("div");
    			div2 = element("div");
    			iframe = element("iframe");
    			t2 = space();
    			div9 = element("div");
    			div8 = element("div");
    			div4 = element("div");
    			p0 = element("p");
    			p0.textContent = "Banner URL";
    			t4 = space();
    			input0 = element("input");
    			t5 = space();
    			input1 = element("input");
    			t6 = space();
    			div5 = element("div");
    			p1 = element("p");
    			p1.textContent = "Width";
    			t8 = space();
    			input2 = element("input");
    			t9 = space();
    			div6 = element("div");
    			p2 = element("p");
    			p2.textContent = "Height";
    			t11 = space();
    			input3 = element("input");
    			t12 = space();
    			div7 = element("div");
    			p3 = element("p");
    			p3.textContent = "Device";
    			t14 = space();
    			select = element("select");
    			option0 = element("option");
    			option0.textContent = "iPhone SE";
    			option1 = element("option");
    			option1.textContent = "iPhone XR";
    			option2 = element("option");
    			option2.textContent = "iPhone 12 Pro";
    			t18 = space();
    			input4 = element("input");
    			attr_dev(div0, "id", "control_page");
    			attr_dev(div0, "class", "svelte-2vyb1p");
    			add_location(div0, file, 116, 3, 3136);
    			attr_dev(div1, "id", "control");
    			attr_dev(div1, "class", "svelte-2vyb1p");
    			add_location(div1, file, 114, 2, 3079);
    			attr_dev(iframe, "title", "banner");
    			attr_dev(iframe, "id", "banner");
    			if (!src_url_equal(iframe.src, iframe_src_value = "/index.html")) attr_dev(iframe, "src", iframe_src_value);
    			attr_dev(iframe, "frameborder", "0");
    			attr_dev(iframe, "scrolling", "no");
    			attr_dev(iframe, "class", "svelte-2vyb1p");
    			add_location(iframe, file, 131, 5, 3531);
    			attr_dev(div2, "id", "banner_container");
    			attr_dev(div2, "class", "svelte-2vyb1p");
    			add_location(div2, file, 130, 4, 3469);
    			attr_dev(div3, "id", "resize_area");
    			attr_dev(div3, "class", "svelte-2vyb1p");
    			add_location(div3, file, 129, 3, 3441);
    			add_location(p0, file, 137, 6, 3749);
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "size", "45");
    			set_style(input0, "width", "200px");
    			add_location(input0, file, 138, 6, 3774);
    			attr_dev(input1, "type", "button");
    			input1.value = "↻";
    			attr_dev(input1, "class", "svelte-2vyb1p");
    			add_location(input1, file, 139, 6, 3888);
    			attr_dev(div4, "class", "widget");
    			add_location(div4, file, 136, 5, 3721);
    			add_location(p1, file, 142, 6, 3990);
    			attr_dev(input2, "type", "number");
    			attr_dev(input2, "size", "45");
    			attr_dev(input2, "min", "0");
    			attr_dev(input2, "class", "svelte-2vyb1p");
    			add_location(input2, file, 143, 6, 4010);
    			attr_dev(div5, "class", "widget");
    			add_location(div5, file, 141, 5, 3962);
    			add_location(p2, file, 146, 6, 4152);
    			attr_dev(input3, "type", "number");
    			attr_dev(input3, "size", "45");
    			attr_dev(input3, "min", "0");
    			attr_dev(input3, "class", "svelte-2vyb1p");
    			add_location(input3, file, 147, 6, 4173);
    			attr_dev(div6, "class", "widget");
    			add_location(div6, file, 145, 5, 4124);
    			add_location(p3, file, 150, 6, 4316);
    			option0.__value = "iphone_se";
    			option0.value = option0.__value;
    			add_location(option0, file, 152, 7, 4411);
    			option1.__value = "iphone_xr";
    			option1.value = option1.__value;
    			add_location(option1, file, 153, 7, 4464);
    			option2.__value = "iphone_12_pro";
    			option2.value = option2.__value;
    			add_location(option2, file, 154, 7, 4517);
    			attr_dev(select, "class", "svelte-2vyb1p");
    			if (/*bannerDevice*/ ctx[5] === void 0) add_render_callback(() => /*select_change_handler*/ ctx[18].call(select));
    			add_location(select, file, 151, 6, 4337);
    			attr_dev(input4, "type", "button");
    			input4.value = "Reset";
    			attr_dev(input4, "class", "svelte-2vyb1p");
    			add_location(input4, file, 156, 6, 4594);
    			attr_dev(div7, "class", "widget");
    			add_location(div7, file, 149, 5, 4288);
    			attr_dev(div8, "class", "row");
    			add_location(div8, file, 135, 4, 3697);
    			attr_dev(div9, "id", "size_info");
    			attr_dev(div9, "class", "svelte-2vyb1p");
    			add_location(div9, file, 134, 3, 3671);
    			attr_dev(div10, "id", "preview");
    			attr_dev(div10, "class", "svelte-2vyb1p");
    			add_location(div10, file, 128, 2, 3418);
    			attr_dev(div11, "id", "ui");
    			attr_dev(div11, "class", "svelte-2vyb1p");
    			add_location(div11, file, 113, 1, 3062);
    			attr_dev(main, "class", "svelte-2vyb1p");
    			add_location(main, file, 112, 0, 3053);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div11);
    			append_dev(div11, div1);
    			mount_component(tabs, div1, null);
    			append_dev(div1, t0);
    			append_dev(div1, div0);

    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].m(div0, null);
    			}

    			append_dev(div11, t1);
    			append_dev(div11, div10);
    			append_dev(div10, div3);
    			append_dev(div3, div2);
    			append_dev(div2, iframe);
    			/*iframe_binding*/ ctx[13](iframe);
    			/*div2_binding*/ ctx[14](div2);
    			append_dev(div10, t2);
    			append_dev(div10, div9);
    			append_dev(div9, div8);
    			append_dev(div8, div4);
    			append_dev(div4, p0);
    			append_dev(div4, t4);
    			append_dev(div4, input0);
    			set_input_value(input0, /*bannerURL*/ ctx[2]);
    			append_dev(div4, t5);
    			append_dev(div4, input1);
    			append_dev(div8, t6);
    			append_dev(div8, div5);
    			append_dev(div5, p1);
    			append_dev(div5, t8);
    			append_dev(div5, input2);
    			set_input_value(input2, /*bannerWidthProp*/ ctx[3]);
    			append_dev(div8, t9);
    			append_dev(div8, div6);
    			append_dev(div6, p2);
    			append_dev(div6, t11);
    			append_dev(div6, input3);
    			set_input_value(input3, /*bannerHeightProp*/ ctx[4]);
    			append_dev(div8, t12);
    			append_dev(div8, div7);
    			append_dev(div7, p3);
    			append_dev(div7, t14);
    			append_dev(div7, select);
    			append_dev(select, option0);
    			append_dev(select, option1);
    			append_dev(select, option2);
    			select_option(select, /*bannerDevice*/ ctx[5]);
    			append_dev(div7, t18);
    			append_dev(div7, input4);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[15]),
    					listen_dev(input0, "keypress", /*bannerSrcKeyPress*/ ctx[8], false, false, false),
    					listen_dev(input1, "click", /*loadBanner*/ ctx[9], false, false, false),
    					listen_dev(input2, "input", /*input2_input_handler*/ ctx[16]),
    					listen_dev(input2, "input", /*bannerSizeChange*/ ctx[7], false, false, false),
    					listen_dev(input3, "input", /*input3_input_handler*/ ctx[17]),
    					listen_dev(input3, "input", /*bannerSizeChange*/ ctx[7], false, false, false),
    					listen_dev(select, "change", /*select_change_handler*/ ctx[18]),
    					listen_dev(select, "change", /*bannerDeviceChange*/ ctx[10], false, false, false),
    					listen_dev(input4, "click", /*bannerResetSize*/ ctx[11], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index !== previous_block_index) {
    				if (if_block) {
    					group_outros();

    					transition_out(if_blocks[previous_block_index], 1, 1, () => {
    						if_blocks[previous_block_index] = null;
    					});

    					check_outros();
    				}

    				if (~current_block_type_index) {
    					if_block = if_blocks[current_block_type_index];

    					if (!if_block) {
    						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    						if_block.c();
    					}

    					transition_in(if_block, 1);
    					if_block.m(div0, null);
    				} else {
    					if_block = null;
    				}
    			}

    			if (dirty & /*bannerURL*/ 4 && input0.value !== /*bannerURL*/ ctx[2]) {
    				set_input_value(input0, /*bannerURL*/ ctx[2]);
    			}

    			if (dirty & /*bannerWidthProp*/ 8 && to_number(input2.value) !== /*bannerWidthProp*/ ctx[3]) {
    				set_input_value(input2, /*bannerWidthProp*/ ctx[3]);
    			}

    			if (dirty & /*bannerHeightProp*/ 16 && to_number(input3.value) !== /*bannerHeightProp*/ ctx[4]) {
    				set_input_value(input3, /*bannerHeightProp*/ ctx[4]);
    			}

    			if (dirty & /*bannerDevice*/ 32) {
    				select_option(select, /*bannerDevice*/ ctx[5]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(tabs.$$.fragment, local);
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(tabs.$$.fragment, local);
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(tabs);

    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].d();
    			}

    			/*iframe_binding*/ ctx[13](null);
    			/*div2_binding*/ ctx[14](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    async function apiRequest(data) {
    	const res = await fetch("/api", {
    		method: "POST",
    		body: JSON.stringify(data)
    	});

    	return await res.json();
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let sse;

    	const screens = {
    		iphone_se: { width: 375, height: 667 },
    		iphone_xr: { width: 414, height: 896 },
    		iphone_12_pro: { width: 390, height: 844 }
    	};

    	let bannerContainer;
    	let banner;
    	let bannerURL = "/index.html";
    	let bannerInternalContainer;
    	let bannerDefaultWidth = 240;
    	let bannerDefaultHeight = 400;
    	let bannerWidth = bannerDefaultWidth;
    	let bannerHeight = bannerDefaultHeight;
    	let bannerWidthProp = bannerWidth;
    	let bannerHeightProp = bannerHeight;
    	let bannerDevice = "default";
    	let observer;

    	// tools, capturer, builder, events
    	let currentTab = "tools";

    	onMount(async () => {
    		sse = new EventSource("/sse?events=watcher");

    		sse.onmessage = async function (event) {
    			JSON.parse(event.data);
    		};

    		sse.onerror = function (error) {
    			console.error("EventSource failed: ", error);
    		};

    		$$invalidate(1, banner.onload = bannerOnLoad, banner);

    		observer = new ResizeObserver(mutations => {
    				bannerWidth = mutations[0].contentRect.width;
    				bannerHeight = mutations[0].contentRect.height;
    				$$invalidate(3, bannerWidthProp = bannerWidth);
    				$$invalidate(4, bannerHeightProp = bannerHeight);
    			});

    		observer.observe(bannerContainer);
    	});

    	function bannerOnLoad(event) {
    		console.log("Banner loaded");
    		const bannerWindow = banner.contentWindow;
    		const bannerDocument = bannerWindow.document;
    		bannerInternalContainer = bannerDocument.getElementById("container");

    		if (bannerInternalContainer) {
    			bannerDefaultWidth = bannerInternalContainer.offsetWidth;
    			bannerDefaultHeight = bannerInternalContainer.offsetHeight;
    		}
    	}

    	function bannerSizeChange(event) {
    		observer.disconnect();
    		$$invalidate(0, bannerContainer.style.width = bannerWidthProp + "px", bannerContainer);
    		$$invalidate(0, bannerContainer.style.height = bannerHeightProp + "px", bannerContainer);
    		observer.observe(bannerContainer);
    	}

    	function bannerSrcKeyPress(event) {
    		if (event.charCode === 13) {
    			loadBanner();
    		}
    	}

    	function loadBanner() {
    		$$invalidate(1, banner.src = "", banner);
    		$$invalidate(1, banner.src = bannerURL, banner);
    		timerStart();
    	}

    	function bannerDeviceChange() {
    		let screen = screens[bannerDevice];
    		$$invalidate(3, bannerWidthProp = screen.width);
    		$$invalidate(4, bannerHeightProp = screen.height);
    		$$invalidate(0, bannerContainer.style.width = bannerWidthProp + "px", bannerContainer);
    		$$invalidate(0, bannerContainer.style.height = bannerHeightProp + "px", bannerContainer);
    	}

    	function bannerResetSize() {
    		$$invalidate(3, bannerWidthProp = bannerDefaultWidth);
    		$$invalidate(4, bannerHeightProp = bannerDefaultHeight);
    		$$invalidate(0, bannerContainer.style.width = bannerWidthProp + "px", bannerContainer);
    		$$invalidate(0, bannerContainer.style.height = bannerHeightProp + "px", bannerContainer);
    	}

    	function tabChange(event) {
    		$$invalidate(6, currentTab = event.detail.tab);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function iframe_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			banner = $$value;
    			$$invalidate(1, banner);
    		});
    	}

    	function div2_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			bannerContainer = $$value;
    			$$invalidate(0, bannerContainer);
    		});
    	}

    	function input0_input_handler() {
    		bannerURL = this.value;
    		$$invalidate(2, bannerURL);
    	}

    	function input2_input_handler() {
    		bannerWidthProp = to_number(this.value);
    		$$invalidate(3, bannerWidthProp);
    	}

    	function input3_input_handler() {
    		bannerHeightProp = to_number(this.value);
    		$$invalidate(4, bannerHeightProp);
    	}

    	function select_change_handler() {
    		bannerDevice = select_value(this);
    		$$invalidate(5, bannerDevice);
    	}

    	$$self.$capture_state = () => ({
    		onMount,
    		Tabs,
    		Tools,
    		timerStart,
    		Capturer,
    		Builder,
    		Events,
    		sse,
    		screens,
    		bannerContainer,
    		banner,
    		bannerURL,
    		bannerInternalContainer,
    		bannerDefaultWidth,
    		bannerDefaultHeight,
    		bannerWidth,
    		bannerHeight,
    		bannerWidthProp,
    		bannerHeightProp,
    		bannerDevice,
    		observer,
    		currentTab,
    		apiRequest,
    		bannerOnLoad,
    		bannerSizeChange,
    		bannerSrcKeyPress,
    		loadBanner,
    		bannerDeviceChange,
    		bannerResetSize,
    		tabChange
    	});

    	$$self.$inject_state = $$props => {
    		if ('sse' in $$props) sse = $$props.sse;
    		if ('bannerContainer' in $$props) $$invalidate(0, bannerContainer = $$props.bannerContainer);
    		if ('banner' in $$props) $$invalidate(1, banner = $$props.banner);
    		if ('bannerURL' in $$props) $$invalidate(2, bannerURL = $$props.bannerURL);
    		if ('bannerInternalContainer' in $$props) bannerInternalContainer = $$props.bannerInternalContainer;
    		if ('bannerDefaultWidth' in $$props) bannerDefaultWidth = $$props.bannerDefaultWidth;
    		if ('bannerDefaultHeight' in $$props) bannerDefaultHeight = $$props.bannerDefaultHeight;
    		if ('bannerWidth' in $$props) bannerWidth = $$props.bannerWidth;
    		if ('bannerHeight' in $$props) bannerHeight = $$props.bannerHeight;
    		if ('bannerWidthProp' in $$props) $$invalidate(3, bannerWidthProp = $$props.bannerWidthProp);
    		if ('bannerHeightProp' in $$props) $$invalidate(4, bannerHeightProp = $$props.bannerHeightProp);
    		if ('bannerDevice' in $$props) $$invalidate(5, bannerDevice = $$props.bannerDevice);
    		if ('observer' in $$props) observer = $$props.observer;
    		if ('currentTab' in $$props) $$invalidate(6, currentTab = $$props.currentTab);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		bannerContainer,
    		banner,
    		bannerURL,
    		bannerWidthProp,
    		bannerHeightProp,
    		bannerDevice,
    		currentTab,
    		bannerSizeChange,
    		bannerSrcKeyPress,
    		loadBanner,
    		bannerDeviceChange,
    		bannerResetSize,
    		tabChange,
    		iframe_binding,
    		div2_binding,
    		input0_input_handler,
    		input2_input_handler,
    		input3_input_handler,
    		select_change_handler
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
