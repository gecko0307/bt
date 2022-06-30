var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
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

    function fade(node, { delay = 0, duration = 400, easing = identity } = {}) {
        const o = +getComputedStyle(node).opacity;
        return {
            delay,
            duration,
            easing,
            css: t => `opacity: ${t * o}`
        };
    }

    /* src\Tabs.svelte generated by Svelte v3.47.0 */
    const file$1 = "src\\Tabs.svelte";

    function create_fragment$1(ctx) {
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
    			add_location(div0, file$1, 16, 2, 336);
    			attr_dev(div1, "class", "tab svelte-1thg375");
    			attr_dev(div1, "data-name", "capturer");
    			attr_dev(div1, "title", "Capturer");
    			toggle_class(div1, "active", /*currentTab*/ ctx[0] === 'capturer');
    			add_location(div1, file$1, 17, 2, 458);
    			attr_dev(div2, "class", "tab svelte-1thg375");
    			attr_dev(div2, "data-name", "builder");
    			attr_dev(div2, "title", "Builder");
    			toggle_class(div2, "active", /*currentTab*/ ctx[0] === 'builder');
    			add_location(div2, file$1, 18, 2, 588);
    			attr_dev(div3, "class", "tab svelte-1thg375");
    			attr_dev(div3, "data-name", "events");
    			attr_dev(div3, "title", "Events & messages");
    			toggle_class(div3, "active", /*currentTab*/ ctx[0] === 'events');
    			add_location(div3, file$1, 19, 2, 715);
    			attr_dev(div4, "class", "tabs svelte-1thg375");
    			add_location(div4, file$1, 15, 1, 314);
    			attr_dev(main, "class", "svelte-1thg375");
    			add_location(main, file$1, 14, 0, 305);
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
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Tabs",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src\App.svelte generated by Svelte v3.47.0 */

    const { console: console_1 } = globals;
    const file = "src\\App.svelte";

    function create_fragment(ctx) {
    	let main;
    	let div10;
    	let div0;
    	let tabs;
    	let t0;
    	let div9;
    	let div2;
    	let div1;
    	let iframe;
    	let iframe_src_value;
    	let t1;
    	let div8;
    	let div7;
    	let div3;
    	let p0;
    	let t3;
    	let input0;
    	let t4;
    	let input1;
    	let t5;
    	let div4;
    	let p1;
    	let t7;
    	let input2;
    	let t8;
    	let div5;
    	let p2;
    	let t10;
    	let input3;
    	let t11;
    	let div6;
    	let p3;
    	let t13;
    	let select;
    	let option0;
    	let option1;
    	let option2;
    	let t17;
    	let input4;
    	let current;
    	let mounted;
    	let dispose;
    	tabs = new Tabs({ $$inline: true });
    	tabs.$on("change", /*tabChange*/ ctx[11]);

    	const block = {
    		c: function create() {
    			main = element("main");
    			div10 = element("div");
    			div0 = element("div");
    			create_component(tabs.$$.fragment);
    			t0 = space();
    			div9 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			iframe = element("iframe");
    			t1 = space();
    			div8 = element("div");
    			div7 = element("div");
    			div3 = element("div");
    			p0 = element("p");
    			p0.textContent = "Banner URL";
    			t3 = space();
    			input0 = element("input");
    			t4 = space();
    			input1 = element("input");
    			t5 = space();
    			div4 = element("div");
    			p1 = element("p");
    			p1.textContent = "Width";
    			t7 = space();
    			input2 = element("input");
    			t8 = space();
    			div5 = element("div");
    			p2 = element("p");
    			p2.textContent = "Height";
    			t10 = space();
    			input3 = element("input");
    			t11 = space();
    			div6 = element("div");
    			p3 = element("p");
    			p3.textContent = "Device";
    			t13 = space();
    			select = element("select");
    			option0 = element("option");
    			option0.textContent = "iPhone SE";
    			option1 = element("option");
    			option1.textContent = "iPhone XR";
    			option2 = element("option");
    			option2.textContent = "iPhone 12 Pro";
    			t17 = space();
    			input4 = element("input");
    			attr_dev(div0, "id", "control");
    			attr_dev(div0, "class", "svelte-x8ul0v");
    			add_location(div0, file, 110, 2, 2926);
    			attr_dev(iframe, "title", "banner");
    			attr_dev(iframe, "id", "banner");
    			if (!src_url_equal(iframe.src, iframe_src_value = "/index.html")) attr_dev(iframe, "src", iframe_src_value);
    			attr_dev(iframe, "frameborder", "0");
    			attr_dev(iframe, "scrolling", "no");
    			attr_dev(iframe, "class", "svelte-x8ul0v");
    			add_location(iframe, file, 116, 5, 3105);
    			attr_dev(div1, "id", "banner_container");
    			attr_dev(div1, "class", "svelte-x8ul0v");
    			add_location(div1, file, 115, 4, 3043);
    			attr_dev(div2, "id", "resize_area");
    			attr_dev(div2, "class", "svelte-x8ul0v");
    			add_location(div2, file, 114, 3, 3015);
    			add_location(p0, file, 122, 6, 3323);
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "size", "45");
    			set_style(input0, "width", "200px");
    			add_location(input0, file, 123, 6, 3348);
    			attr_dev(input1, "type", "button");
    			input1.value = "↻";
    			attr_dev(input1, "class", "svelte-x8ul0v");
    			add_location(input1, file, 124, 6, 3462);
    			attr_dev(div3, "class", "widget");
    			add_location(div3, file, 121, 5, 3295);
    			add_location(p1, file, 127, 6, 3564);
    			attr_dev(input2, "type", "number");
    			attr_dev(input2, "size", "45");
    			attr_dev(input2, "min", "0");
    			attr_dev(input2, "class", "svelte-x8ul0v");
    			add_location(input2, file, 128, 6, 3584);
    			attr_dev(div4, "class", "widget");
    			add_location(div4, file, 126, 5, 3536);
    			add_location(p2, file, 131, 6, 3726);
    			attr_dev(input3, "type", "number");
    			attr_dev(input3, "size", "45");
    			attr_dev(input3, "min", "0");
    			attr_dev(input3, "class", "svelte-x8ul0v");
    			add_location(input3, file, 132, 6, 3747);
    			attr_dev(div5, "class", "widget");
    			add_location(div5, file, 130, 5, 3698);
    			add_location(p3, file, 135, 6, 3890);
    			option0.__value = "iphone_se";
    			option0.value = option0.__value;
    			add_location(option0, file, 137, 7, 3985);
    			option1.__value = "iphone_xr";
    			option1.value = option1.__value;
    			add_location(option1, file, 138, 7, 4038);
    			option2.__value = "iphone_12_pro";
    			option2.value = option2.__value;
    			add_location(option2, file, 139, 7, 4091);
    			attr_dev(select, "class", "svelte-x8ul0v");
    			if (/*bannerDevice*/ ctx[5] === void 0) add_render_callback(() => /*select_change_handler*/ ctx[17].call(select));
    			add_location(select, file, 136, 6, 3911);
    			attr_dev(input4, "type", "button");
    			input4.value = "Reset";
    			attr_dev(input4, "class", "svelte-x8ul0v");
    			add_location(input4, file, 141, 6, 4168);
    			attr_dev(div6, "class", "widget");
    			add_location(div6, file, 134, 5, 3862);
    			attr_dev(div7, "class", "row");
    			add_location(div7, file, 120, 4, 3271);
    			attr_dev(div8, "id", "size_info");
    			attr_dev(div8, "class", "svelte-x8ul0v");
    			add_location(div8, file, 119, 3, 3245);
    			attr_dev(div9, "id", "preview");
    			attr_dev(div9, "class", "svelte-x8ul0v");
    			add_location(div9, file, 113, 2, 2992);
    			attr_dev(div10, "id", "ui");
    			attr_dev(div10, "class", "svelte-x8ul0v");
    			add_location(div10, file, 109, 1, 2909);
    			attr_dev(main, "class", "svelte-x8ul0v");
    			add_location(main, file, 108, 0, 2900);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div10);
    			append_dev(div10, div0);
    			mount_component(tabs, div0, null);
    			append_dev(div10, t0);
    			append_dev(div10, div9);
    			append_dev(div9, div2);
    			append_dev(div2, div1);
    			append_dev(div1, iframe);
    			/*iframe_binding*/ ctx[12](iframe);
    			/*div1_binding*/ ctx[13](div1);
    			append_dev(div9, t1);
    			append_dev(div9, div8);
    			append_dev(div8, div7);
    			append_dev(div7, div3);
    			append_dev(div3, p0);
    			append_dev(div3, t3);
    			append_dev(div3, input0);
    			set_input_value(input0, /*bannerURL*/ ctx[2]);
    			append_dev(div3, t4);
    			append_dev(div3, input1);
    			append_dev(div7, t5);
    			append_dev(div7, div4);
    			append_dev(div4, p1);
    			append_dev(div4, t7);
    			append_dev(div4, input2);
    			set_input_value(input2, /*bannerWidthProp*/ ctx[3]);
    			append_dev(div7, t8);
    			append_dev(div7, div5);
    			append_dev(div5, p2);
    			append_dev(div5, t10);
    			append_dev(div5, input3);
    			set_input_value(input3, /*bannerHeightProp*/ ctx[4]);
    			append_dev(div7, t11);
    			append_dev(div7, div6);
    			append_dev(div6, p3);
    			append_dev(div6, t13);
    			append_dev(div6, select);
    			append_dev(select, option0);
    			append_dev(select, option1);
    			append_dev(select, option2);
    			select_option(select, /*bannerDevice*/ ctx[5]);
    			append_dev(div6, t17);
    			append_dev(div6, input4);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[14]),
    					listen_dev(input0, "keypress", /*bannerSrcKeyPress*/ ctx[7], false, false, false),
    					listen_dev(input1, "click", /*loadBanner*/ ctx[8], false, false, false),
    					listen_dev(input2, "input", /*input2_input_handler*/ ctx[15]),
    					listen_dev(input2, "input", /*bannerSizeChange*/ ctx[6], false, false, false),
    					listen_dev(input3, "input", /*input3_input_handler*/ ctx[16]),
    					listen_dev(input3, "input", /*bannerSizeChange*/ ctx[6], false, false, false),
    					listen_dev(select, "change", /*select_change_handler*/ ctx[17]),
    					listen_dev(select, "change", /*bannerDeviceChange*/ ctx[9], false, false, false),
    					listen_dev(input4, "click", /*bannerResetSize*/ ctx[10], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
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
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(tabs.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(tabs);
    			/*iframe_binding*/ ctx[12](null);
    			/*div1_binding*/ ctx[13](null);
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
    		currentTab = event.detail.tab;
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

    	function div1_binding($$value) {
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
    		fade,
    		Tabs,
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
    		if ('currentTab' in $$props) currentTab = $$props.currentTab;
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
    		bannerSizeChange,
    		bannerSrcKeyPress,
    		loadBanner,
    		bannerDeviceChange,
    		bannerResetSize,
    		tabChange,
    		iframe_binding,
    		div1_binding,
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
